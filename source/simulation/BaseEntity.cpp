#include "precompiled.h"

#include "BaseEntity.h"
#include "ObjectManager.h"
#include "CStr.h"

#include "ps/Xeromyces.h"

#include "CLogger.h"
#define LOG_CATEGORY "entity"

CBaseEntity::CBaseEntity()
{
	AddProperty( L"tag", &m_Tag, false );
	AddProperty( L"parent", (CBaseEntity**)&m_base, false );
	AddProperty( L"actions.move.speed", &m_speed );
	AddProperty( L"actions.move.turningradius", &m_turningRadius );
	AddProperty( L"actions.attack.range", &m_meleeRange );
	AddProperty( L"actions.attack.rangemin", &m_meleeRangeMin );
	AddProperty( L"actor", &m_actorName );
	AddProperty( L"traits.extant", &m_extant );
	AddProperty( L"traits.corpse", &m_corpse );

	for( int t = 0; t < EVENT_LAST; t++ )
		AddProperty( EventNames[t], &m_EventHandlers[t] );
	
	m_base = NULL;

	// Initialize, make life a little easier on the scriptors
	m_speed = m_turningRadius = m_meleeRange = m_meleeRangeMin = 0.0f;
	m_extant = true; m_corpse = CStrW();

	m_bound_type = CBoundingObject::BOUND_NONE;
	m_bound_circle = NULL;
	m_bound_box = NULL;
}

CBaseEntity::~CBaseEntity()
{
	if( m_bound_box )
		delete( m_bound_box );
	if( m_bound_circle )
		delete( m_bound_circle );
}

void CBaseEntity::loadBase()
{ 
	// Don't bother if we're providing a replacement.
	if( m_bound_type == CBoundingObject::BOUND_NONE )
	{
		if( m_base->m_bound_type == CBoundingObject::BOUND_CIRCLE )
		{
 			m_bound_circle = new CBoundingCircle();
			m_bound_circle->setRadius( m_base->m_bound_circle->m_radius );
		}
		else if( m_base->m_bound_type == CBoundingObject::BOUND_OABB )
		{
			m_bound_box = new CBoundingBox();
			m_bound_box->setDimensions( m_base->m_bound_box->getWidth(), m_base->m_bound_box->getHeight() );
		}
		m_bound_type = m_base->m_bound_type;
	}

	SetBase( m_base );
}

bool CBaseEntity::loadXML( CStr filename )
{
	CXeromyces XeroFile;
	if (XeroFile.Load(filename) != PSRETURN_OK)
		// Fail
		return false;

	// Define all the elements and attributes used in the XML file
	#define EL(x) int el_##x = XeroFile.getElementID(#x)
	#define AT(x) int at_##x = XeroFile.getAttributeID(#x)
	// Only the ones we can't load using normal methods.
	EL(entity);
	EL(script);
	EL(footprint);
	EL(event);
	AT(parent);
	AT(radius);
	AT(width);
	AT(height);
	AT(on);
	AT(file);
	#undef AT
	#undef EL

	XMBElement Root = XeroFile.getRoot();

	if( Root.getNodeName() != el_entity )
	{
		LOG( ERROR, LOG_CATEGORY, "CBaseEntity::LoadXML: XML root was not \"Entity\" in file %s. Load failed.", filename.c_str() );
		return( false );
	}

	XMBElementList RootChildren = Root.getChildNodes();

	m_Tag = CStr(filename).AfterLast("/").BeforeLast(".xml");

	m_Base_Name = Root.getAttributes().getNamedItem( at_parent );
	
	for (int i = 0; i < RootChildren.Count; ++i)
	{
		XMBElement Child = RootChildren.item(i);

		unsigned int ChildName = Child.getNodeName();

		if( ChildName == el_script )
		{
			CStr Include = Child.getAttributes().getNamedItem( at_file );

			jsval dy;

			// TODO: Probably try and determine if this file has already been loaded, and skip it.

			if( Include.Length() )
			{
				CVFSFile IncludeFile;
				if( IncludeFile.Load( Include ) != PSRETURN_OK )
				{
					LOG( WARNING, LOG_CATEGORY, "CBaseEntity::loadXML: Could not load script file %s specified in file %s; ignored.", Include.c_str(), filename.c_str() );
				}
				else
					JS_EvaluateScript( g_ScriptingHost.getContext(), JS_GetGlobalObject( g_ScriptingHost.GetContext() ), (const char*)IncludeFile.GetBuffer(), (int)IncludeFile.GetBufferSize(), Include, 1, &dy );
			}

			CStr Inline = Child.getText();

			if( Inline.Length() )
				JS_EvaluateScript( g_ScriptingHost.getContext(), JS_GetGlobalObject( g_ScriptingHost.GetContext() ), Inline.c_str(), (int)Inline.Length(), filename.c_str(), Child.getLineNumber(), &dy );
			
		}
		else if (ChildName == el_footprint)
		{
			if( Child.getAttributes().getNamedItem( at_radius ).length() )
			{
				// Specifying a circular footprint
				if( !m_bound_circle )
					m_bound_circle = new CBoundingCircle();
				CStrW radius (Child.getAttributes().getNamedItem(at_radius));
				m_bound_circle->setRadius( radius.ToFloat() );
				m_bound_type = CBoundingObject::BOUND_CIRCLE;
			}
			else
			{
				if( !m_bound_box )
				m_bound_box = new CBoundingBox();
				CStrW width (Child.getAttributes().getNamedItem(at_width));
				CStrW height (Child.getAttributes().getNamedItem(at_height));

				m_bound_box->setDimensions( width.ToFloat(), height.ToFloat() );
				m_bound_type = CBoundingObject::BOUND_OABB;
			}
		}
		else if( ChildName == el_event )
		{
			// Action...On for consistency with the GUI.
			CStrW EventName = L"on" + (CStrW)Child.getAttributes().getNamedItem( at_on );

			CStrW Code (Child.getText());
			
			// Does a property with this name already exist?

			for( uint eventID = 0; eventID < EVENT_LAST; eventID++ )
			{
				if( CStrW( EventNames[eventID] ) == EventName )
				{
					m_EventHandlers[eventID].Compile( CStrW( filename ) + L"::" + EventName + L" (" + CStrW( Child.getLineNumber() ) + L")", Code );
					HasProperty( EventName )->m_Inherited = false;
					break;
				}
			}
		}
		else
		{
			XMLLoadProperty( XeroFile, Child, CStrW() );
		}
	}	

	return true;
}

void CBaseEntity::XMLLoadProperty( const CXeromyces& XeroFile, const XMBElement& Source, CStrW BasePropertyName )
{
	// Add a property, put the node text into it.
	CStrW PropertyName = BasePropertyName + CStr8( XeroFile.getElementString( Source.getNodeName() ) );

	IJSProperty* Existing = HasProperty( PropertyName );
	if( Existing )
	{	
		if( !Existing->m_Intrinsic )
			LOG( WARNING, LOG_CATEGORY, "CBaseEntity::XMLAddProperty: %s already defined for %s. Property trees will be merged.", PropertyName.c_str(), m_Tag.c_str() );
		Existing->Set( JSParseString( Source.getText() ) );
		Existing->m_Inherited = false;
	}
	else
	{
		if( !Source.getText().length() )
		{
			// Arbitrarily say that if a node has no other value, define it to be 'true'.
			// Appears to be the most convenient thing to do in most circumstances.
			AddProperty( PropertyName, JSVAL_TRUE );
		}
		else
			AddProperty( PropertyName, Source.getText() );
	}

	
	PropertyName += CStrW( L"." );

	// Retrieve any attributes it has and add them as subproperties.
	XMBAttributeList AttributeSet = Source.getAttributes();
	for( unsigned int AttributeID = 0; AttributeID < (unsigned int)AttributeSet.Count; AttributeID++ )
	{
		XMBAttribute Attribute = AttributeSet.item( AttributeID );
		CStrW AttributeName = PropertyName + CStr8( XeroFile.getAttributeString( Attribute.Name ) );
		Existing = HasProperty( AttributeName );
		
		if( Existing )
		{
			Existing->Set( JSParseString( Attribute.Value ) );
			Existing->m_Inherited = false;
		}
		else
			AddProperty( AttributeName, Attribute.Value );
	}

	// Retrieve any child nodes the property has and, similarly, add them as subproperties.
	XMBElementList NodeSet = Source.getChildNodes();
	for( unsigned int NodeID = 0; NodeID < (unsigned int)NodeSet.Count; NodeID++ )
	{
		XMBElement Node = NodeSet.item( NodeID );
		XMLLoadProperty( XeroFile, Node, PropertyName );
	}

}

/*
	Scripting Interface
*/

// Scripting initialization

void CBaseEntity::ScriptingInit()
{
	AddMethod<jsval, &CBaseEntity::ToString>( "toString", 0 );
	CJSObject<CBaseEntity>::ScriptingInit( "EntityTemplate" );
}

// Script-bound functions

jsval CBaseEntity::ToString( JSContext* cx, uintN argc, jsval* argv )
{
	wchar_t buffer[256];
	swprintf( buffer, 256, L"[object EntityTemplate: %ls]", m_Tag.c_str() );
	buffer[255] = 0;
	utf16string str16(buffer, buffer+wcslen(buffer));
	return( STRING_TO_JSVAL( JS_NewUCStringCopyZ( cx, str16.c_str() ) ) );
}
