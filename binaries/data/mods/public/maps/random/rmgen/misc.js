///////////////////////////////////////////////////////////////////////////////////////////	passageMaker////	Function for creating shallow water between two given points by changing the heiight of all tiles in//	the path with height less than or equal to "maxheight" to "height"////	x1,z1: 	Starting point of path//	x2,z2: 	Ending point of path//	width: 	Width of the shallow//	maxheight:		Maximum height that it changes//	height:		Height of the shallow//	smooth:		smooth elevation in borders//	tileclass:		(Optianal) - Adds those tiles to the class given//	terrain:		(Optional) - Changes the texture of the elevated land///////////////////////////////////////////////////////////////////////////////////////////function passageMaker(x1, z1, x2, z2, width, maxheight, height, smooth, tileclass, terrain){	var mapSize = g_Map.size;	for (var ix = 0; ix < mapSize; ix++)	{		for (var iz = 0; iz < mapSize; iz++)		{			var a = z1-z2;			var b = x2-x1;			var c = (z1*(x1-x2))-(x1*(z1-z2));			var dis = abs(a*ix + b*iz + c)/sqrt(a*a + b*b);			var k = (a*ix + b*iz + c)/(a*a + b*b);			var my = iz-(b*k);			var inline = 0;			if (b == 0)			{				if ((iz <= Math.max(z1,z2))&&(Math.min(z1,z2)))				{					inline = 1;				}			}			else			{				if ((my <= Math.max(z1,z2))&&(my >= Math.min(z1,z2)))				{					inline = 1;				}			}			if ((dis <= width)&&(inline))			{				if(g_Map.getHeight(ix, iz) <= maxheight)				{					if (dis >= width - smooth)					{						g_Map.setHeight(ix, iz, ((width - dis)*(height)+(g_Map.getHeight(ix, iz))*(dis + smooth - width))/(smooth)/2);					}					else					{						g_Map.setHeight(ix, iz, height);					}					if (tileclass !== undefined)					{						addToClass(ix, iz, tileclass);					}						if (terrain !== undefined)					{						placeTerrain(ix, iz, terrain);					}				}			}		}	}	}////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////rndRiver is a fuction that creates random values useful for making a jagged river.////it works the same as sin or cos function. the only difference is that it's period is 1 instead of 2*pi//it needs the "seed" parameter to use it to make random curves that don't get broken.//seed must be created using randFloat(). or else it won't work////	f:	Input: Same as angle in a sine function//	seed:	Random Seed: Best to implement is to use randFloat()////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////function rndRiver(f, seed){	var rndRq = seed;	var rndRw = rndRq;	var rndRe = 0;	var rndRr = f-floor(f);	var rndRa = 0;	for (var rndRx=0; rndRx<=floor(f); rndRx++)	{		rndRw = 10*(rndRw-floor(rndRw));	}	if (rndRx%2==0)	{		var rndRs = -1;	}	else	{		var rndRs = 1;	}	rndRe = (floor(rndRw))%5;	if (rndRe==0)	{		rndRa = (rndRs)*2.3*(rndRr)*(rndRr-1)*(rndRr-0.5)*(rndRr-0.5);	}	else if (rndRe==1)	{		rndRa = (rndRs)*2.6*(rndRr)*(rndRr-1)*(rndRr-0.3)*(rndRr-0.7);	}	else if (rndRe==2)	{		rndRa = (rndRs)*22*(rndRr)*(rndRr-1)*(rndRr-0.2)*(rndRr-0.3)*(rndRr-0.3)*(rndRr-0.8);	}	else if (rndRe==3)	{		rndRa = (rndRs)*180*(rndRr)*(rndRr-1)*(rndRr-0.2)*(rndRr-0.2)*(rndRr-0.4)*(rndRr-0.6)*(rndRr-0.6)*(rndRr-0.8);	}	else if (rndRe==4)	{		rndRa = (rndRs)*2.6*(rndRr)*(rndRr-1)*(rndRr-0.5)*(rndRr-0.7);	}	return rndRa;}/////////////////////////////////////////////////////////////////////////////////////////// createStartingPlayerEntities////	Creates the starting player entities//	fx&fz: position of player base//	playerid: id of player//	civEntities: use getStartingEntities(id-1) fo this one//	BUILDING_ANGlE: angle of main base building/////////////////////////////////////////////////////////////////////////////////////////////function createStartingPlayerEntities(fx, fz, playerid, civEntities, BUILDING_ANGlE){	var uDist = 6;	var uSpace = 2;	placeObject(fx, fz, civEntities[0].Template, playerid, BUILDING_ANGlE);	for (var j = 1; j < civEntities.length; ++j)	{		var uAngle = BUILDING_ANGlE - PI * (2-j) / 2;		var count = (civEntities[j].Count !== undefined ? civEntities[j].Count : 1);		for (var numberofentities = 0; numberofentities < count; numberofentities++)		{			var ux = fx + uDist * cos(uAngle) + numberofentities * uSpace * cos(uAngle + PI/2) - (0.75 * uSpace * floor(count / 2) * cos(uAngle + PI/2));			var uz = fz + uDist * sin(uAngle) + numberofentities * uSpace * sin(uAngle + PI/2) - (0.75 * uSpace * floor(count / 2) * sin(uAngle + PI/2));			placeObject(ux, uz, civEntities[j].Template, playerid, uAngle); 		}	}}//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////// placeCivDefaultEntities////	Creates the default starting player entities depending on the players civ//	fx&fy: position of player base//	playerid: id of player//	angle: angle of main base building, optional, default is BUILDING_ANGlE//	kwargs: Takes some optional keyword arguments to tweek things//		'iberWall': may be false, 'walls' (default) or 'towers'. Determines the defensive structures Iberians get as civ bonus////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////function placeCivDefaultEntities(fx, fz, playerid, angle, kwargs){	// Unpack kwargs	kwargs = (kwargs || {});	var iberWall = 'walls';	if ('iberWall' in kwargs)		iberWall = kwargs['iberWall'];	// Place default civ starting entities	var civ = g_MapSettings.PlayerData[playerid-1].Civ;	var civEntities = getStartingEntities(playerid-1);	var uDist = 6;	var uSpace = 2;	placeObject(fx, fz, civEntities[0].Template, playerid, angle);	for (var j = 1; j < civEntities.length; ++j)	{		var uAngle = angle - PI * (2-j) / 2;		var count = (civEntities[j].Count !== undefined ? civEntities[j].Count : 1);		for (var numberofentities = 0; numberofentities < count; numberofentities++)		{			var ux = fx + uDist * cos(uAngle) + numberofentities * uSpace * cos(uAngle + PI/2) - (0.75 * uSpace * floor(count / 2) * cos(uAngle + PI/2));			var uz = fz + uDist * sin(uAngle) + numberofentities * uSpace * sin(uAngle + PI/2) - (0.75 * uSpace * floor(count / 2) * sin(uAngle + PI/2));			placeObject(ux, uz, civEntities[j].Template, playerid, uAngle); 		}	}	// Add defensive structiures for Iberians as their civ bonus	if (civ == 'iber' && iberWall != false)	{		var iberWallRadius = 20;		if (iberWall == 'towers')			placePolygonalWall(fx, fz, 15, ['entry'], 'tower', civ, playerid, angle, 5);		else		{			// Irregular polygonal Fortress			// Documented while in test. Remove documentation when sufficient.			// placeIrregularPolygonalWall(fx, fz, iberWallRadius/*radius*/, 'tower'/*corner wall element*/, civ, playerid, angle/*angle the first wall faces*/, randInt(5, 7)/*corners*/, 0.4/*irregularity (0 to 1)*/);						// Generic 'organic' looking fortress			placeGenericFortress(fx, fz, iberWallRadius/*radius*/, playerid, ['tower', 'wall', 'tower', 'entry', 'tower', 'wall'], civ, PI/6/*angle randomness (0-PI/4 reccommendet)*/)						// Polygonal Fortress			// placePolygonalWall(fx, fz, iberWallRadius, ['wall', 'tower', 'entry', 'tower'], 'tower', civ, playerid, angle, randInt(5, 7));						// A circular Fortress			// placeCircularWall(fx, fz, iberWallRadius, ['tower', 'wallLong', 'tower', 'entry', 'tower', 'wall'], civ, playerid, angle, 2*PI);						// A 'lego' fortress			// placeFortress(fx, fz, 'iberCivBonus', civ, playerid, angle + randInt(4) * PI/2);		}	}}/////////////////////////////////////////////////////////////////////////////////////////// paintTerrainBasedOnHeight////	paints the tiles which have a height between minheight and maxheight with the given terrain//	minheight: minimum height of the tile//	maxheight: maximum height of the tile//	mode: accepts 4 values. 0 means the it will select tiles with height more than minheight and less than maxheight.//  1 means it selects tiles with height more than or equal to minheight and less than max height. 2 means more than//  minheight and less than or equal to maxheight. 3 means more than or equal to minheight and less than or equal to maxheight//	terrain: intended terrain texture/////////////////////////////////////////////////////////////////////////////////////////////function paintTerrainBasedOnHeight(minheight, maxheight, mode, terrain){	var mSize = g_Map.size;	for (var qx = 0; qx < mSize; qx++)	{		for (var qz = 0; qz < mSize; qz++)		{			if (mode == 0)			{				if ((g_Map.getHeight(qx, qz) > minheight)&&(g_Map.getHeight(qx, qz) < maxheight))				{					placeTerrain(qx, qz, terrain);				}			}			else if (mode == 1)			{				if ((g_Map.getHeight(qx, qz) >= minheight)&&(g_Map.getHeight(qx, qz) < maxheight))				{					placeTerrain(qx, qz, terrain);				}			}			else if (mode == 2)			{				if ((g_Map.getHeight(qx, qz) > minheight)&&(g_Map.getHeight(qx, qz) <= maxheight))				{					placeTerrain(qx, qz, terrain);				}			}			else if (mode == 3)			{				if ((g_Map.getHeight(qx, qz) >= minheight)&&(g_Map.getHeight(qx, qz) <= maxheight))				{					placeTerrain(qx, qz, terrain);				}			}		}	}}/////////////////////////////////////////////////////////////////////////////////////////// paintTileClassBasedOnHeight////	paints the tiles which have a height between minheight and maxheight with the given tile class//	minheight: minimum height of the tile//	maxheight: maximum height of the tile//	mode: accepts 4 values. 0 means the it will select tiles with height more than minheight and less than maxheight.//  1 means it selects tiles with height more than or equal to minheight and less than max height. 2 means more than//  minheight and less than or equal to maxheight. 3 means more than or equal to minheight and less than or equal to maxheight//	tileclass: intended tile class/////////////////////////////////////////////////////////////////////////////////////////////function paintTileClassBasedOnHeight(minheight, maxheight, mode, tileclass){	var mSize = g_Map.size;	for (var qx = 0; qx < mSize; qx++)	{		for (var qz = 0; qz < mSize; qz++)		{			if (mode == 0)			{				if ((g_Map.getHeight(qx, qz) > minheight)&&(g_Map.getHeight(qx, qz) < maxheight))				{					addToClass(qx, qz, tileclass);				}			}			else if (mode == 1)			{				if ((g_Map.getHeight(qx, qz) >= minheight)&&(g_Map.getHeight(qx, qz) < maxheight))				{					addToClass(qx, qz, tileclass);				}			}			else if (mode == 2)			{				if ((g_Map.getHeight(qx, qz) > minheight)&&(g_Map.getHeight(qx, qz) <= maxheight))				{					addToClass(qx, qz, tileclass);				}			}			else if (mode == 3)			{				if ((g_Map.getHeight(qx, qz) >= minheight)&&(g_Map.getHeight(qx, qz) <= maxheight))				{					addToClass(qx, qz, tileclass);				}			}		}	}}