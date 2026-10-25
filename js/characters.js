// Personajes jugables. Frames detectados por componentes conexas (ver docs/sprites.md), en píxeles
// de la hoja original. Las animaciones que la hoja no trae reutilizan otro frame (el puñetazo hace
// de lanzamiento de papel; derribado = caída).
const DANI_FRAMES = {
    idle: [[120, 68, 198, 688], [376, 68, 190, 692]],
    walk: [[624, 100, 262, 660], [906, 100, 284, 652], [1222, 100, 344, 660]],
    run: [[1560, 166, 350, 588], [1892, 156, 250, 596]],
    jump: [[2330, 42, 288, 646]],
    fall: [[2142, 42, 200, 630]],
    crouch: [[2070, 824, 310, 342]],
    melee: [[64, 856, 296, 570, 164], [404, 866, 430, 558, 238], [804, 870, 274, 548, 155]],
    throw: [[404, 866, 430, 558, 238]],
    hurt: [[1196, 874, 280, 558]],
    knock: [[1508, 1012, 482, 418]],
    downed: [[1508, 1012, 482, 418]],
    land: [[1892, 156, 250, 596]],
    death: [[2148, 1294, 568, 134]],
};

const DANI_CAR_FRAMES = {
    drive: [[80, 176, 546, 472], [998, 124, 736, 522, 428], [2476, 798, 614, 466]],
    crash: [[2136, 150, 944, 496, 400], [354, 724, 660, 554, 290], [1312, 762, 674, 510, 348]],
};

const FER_FRAMES = {
    idle: [[44, 58, 160, 594]],
    walk: [[764, 58, 220, 590], [1006, 58, 190, 594], [1226, 58, 222, 590]],
    run: [[1520, 94, 286, 556], [1794, 98, 260, 552], [2004, 100, 352, 548]],
    jump: [[2662, 26, 226, 502]],
    fall: [[2662, 26, 226, 502]],
    crouch: [[1060, 810, 260, 506]],
    melee: [[22, 740, 258, 572, 160], [304, 740, 372, 572, 154], [636, 740, 370, 572, 162]],
    throw: [[636, 740, 370, 572, 162]],
    hurt: [[1664, 774, 268, 542], [1932, 774, 224, 542]],
    knock: [[2190, 1014, 436, 306]],
    downed: [[2190, 1014, 436, 306]],
    land: [[2438, 106, 198, 548]],
    death: [[2650, 1206, 496, 112]],
};

const GUILLE_FRAMES = {
    idle: [[92, 48, 152, 436], [334, 48, 152, 434], [572, 48, 154, 436]],
    walk: [[970, 54, 192, 428], [1208, 52, 196, 428], [1462, 54, 190, 426]],
    run: [[1838, 62, 272, 420], [2118, 62, 276, 420], [2400, 64, 280, 412]],
    jump: [[402, 556, 232, 412]],
    fall: [[402, 556, 232, 412]],
    crouch: [[2054, 698, 248, 300]],
    melee: [[1154, 588, 324, 406, 171], [1488, 590, 316, 404, 189]],
    throw: [[1154, 588, 324, 406, 171]],
    hurt: [[202, 1058, 178, 406], [490, 1070, 228, 394]],
    knock: [[932, 1118, 382, 332]],
    downed: [[1390, 1324, 460, 122]],
    land: [[730, 618, 202, 380]],
    death: [[2088, 1316, 494, 126]],
};

// Hojas de art/ (Rober: la versión con gorra). anchorX de los golpes = centro de la cabeza.
const CHARLY_FRAMES = {
    idle: [[40, 42, 228, 628], [306, 44, 234, 626]],
    walk: [[788, 60, 278, 610], [1074, 58, 292, 602]],
    run: [[1478, 80, 360, 586], [1858, 80, 364, 586]],
    jump: [[2612, 22, 260, 532]],
    fall: [[2612, 22, 260, 532]],
    crouch: [[1442, 912, 328, 426]],
    melee: [[16, 746, 430, 592, 208], [366, 750, 414, 582, 218], [702, 746, 410, 588, 227]],
    throw: [[366, 750, 414, 582, 218]],
    hurt: [[1794, 734, 340, 606]],
    knock: [[2176, 748, 602, 514]],
    downed: [[2176, 748, 602, 514]],
    land: [[2360, 98, 242, 572]],
    death: [[2540, 1150, 614, 184]],
};

const DAVID_FRAMES = {
    idle: [[76, 68, 146, 546]],
    walk: [[400, 68, 168, 542], [592, 68, 206, 544], [816, 68, 188, 538]],
    run: [[1156, 86, 248, 526], [1366, 100, 290, 510], [1608, 88, 288, 524]],
    jump: [[2242, 36, 212, 462]],
    fall: [[2242, 36, 212, 462]],
    crouch: [[1038, 788, 274, 410]],
    melee: [[36, 702, 242, 494, 167], [288, 702, 364, 492, 185], [578, 700, 352, 492, 171]],
    throw: [[578, 700, 352, 492, 171]],
    hurt: [[1382, 700, 182, 498], [1570, 698, 200, 500]],
    knock: [[1846, 970, 376, 228]],
    downed: [[1846, 970, 376, 228]],
    land: [[2034, 118, 184, 496]],
    death: [[2262, 1100, 456, 98]],
};

// Los dos frames de daño se tocan en la hoja: recortes solapados, keepLargest quita al vecino.
const JUANCARLOS_FRAMES = {
    idle: [[42, 54, 196, 616]],
    walk: [[586, 58, 254, 600], [862, 60, 244, 600]],
    run: [[1404, 98, 378, 552], [1746, 92, 380, 542]],
    jump: [[2616, 30, 276, 492]],
    fall: [[2616, 30, 276, 492]],
    crouch: [[1128, 814, 284, 518]],
    melee: [[306, 754, 272, 568, 185], [12, 752, 368, 578, 156], [592, 754, 360, 568, 176]],
    throw: [[592, 754, 360, 568, 176]],
    hurt: [[1590, 760, 250, 572], [1780, 760, 320, 572]],
    knock: [[2124, 884, 454, 360]],
    downed: [[2124, 884, 454, 360]],
    land: [[2392, 116, 218, 550]],
    death: [[2574, 1200, 580, 128]],
};

// El primer frame de correr está pegado al segundo y no se puede separar limpio: solo dos.
const SERGIO_FRAMES = {
    idle: [[60, 68, 174, 668]],
    walk: [[400, 78, 212, 654], [644, 80, 248, 650], [908, 80, 242, 650]],
    run: [[1396, 116, 282, 618], [1616, 120, 348, 610]],
    jump: [[2238, 40, 238, 552]],
    fall: [[2238, 40, 238, 552]],
    crouch: [[968, 932, 266, 550]],
    melee: [[38, 860, 278, 622, 153], [272, 868, 384, 610, 182], [552, 872, 372, 600, 193]],
    throw: [[552, 872, 372, 600, 193]],
    hurt: [[1400, 876, 398, 606]],
    knock: [[1852, 1042, 506, 366]],
    downed: [[1852, 1042, 506, 366]],
    land: [[2004, 128, 212, 600]],
    death: [[2100, 1376, 622, 120]],
};

const ROBER_FRAMES = {
    idle: [[60, 56, 174, 586], [354, 56, 174, 586]],
    walk: [[752, 62, 226, 578], [1006, 62, 224, 580], [1252, 62, 234, 576]],
    run: [[1618, 84, 370, 556], [1908, 82, 374, 550]],
    jump: [[2638, 24, 230, 510]],
    fall: [[2638, 24, 230, 510]],
    crouch: [[1314, 824, 288, 478]],
    melee: [[40, 746, 276, 552, 189], [326, 746, 400, 550, 202], [650, 746, 394, 548, 194]],
    throw: [[650, 746, 394, 548, 194]],
    hurt: [[1630, 732, 224, 570], [1874, 738, 242, 562]],
    knock: [[2164, 788, 470, 388]],
    downed: [[2164, 788, 470, 388]],
    land: [[2398, 100, 226, 542]],
    death: [[2598, 1170, 532, 134]],
};

// Los puñetazos y dos pasos se tocan por los pies: cortes rectos donde menos figura hay (la zapatilla
// de atrás de los golpes pierde la punta).
const ALVARO_FRAMES = {
    idle: [[54, 78, 194, 628]],
    walk: [[496, 90, 260, 604], [748, 90, 198, 608], [946, 90, 242, 608]],
    run: [[1322, 140, 338, 558], [1610, 126, 340, 540]],
    jump: [[2252, 50, 272, 504]],
    fall: [[2252, 50, 272, 504]],
    crouch: [[1076, 1096, 284, 422]],
    melee: [[18, 942, 271, 570, 160], [289, 942, 260, 570, 145], [549, 942, 275, 570, 97]],
    throw: [[549, 942, 275, 570, 97]],
    hurt: [[1368, 950, 268, 566], [1610, 970, 264, 540]],
    knock: [[1836, 1054, 468, 334]],
    downed: [[1836, 1054, 468, 334]],
    land: [[2066, 156, 198, 548]],
    death: [[2168, 1394, 568, 126]],
};

// Los dos primeros puñetazos se tocan por el brazo: recortes solapados, keepLargest quita al vecino.
const TONY_FRAMES = {
    idle: [[100, 94, 154, 538]],
    walk: [[548, 94, 198, 532], [778, 94, 194, 530], [994, 94, 182, 532]],
    run: [[1366, 122, 292, 502], [1620, 124, 312, 498], [1896, 120, 312, 502]],
    jump: [[2610, 54, 216, 476]],
    fall: [[2610, 54, 216, 476]],
    crouch: [[1190, 888, 254, 386]],
    melee: [[44, 770, 220, 504, 131], [276, 770, 300, 502, 137], [510, 770, 284, 502, 131]],
    throw: [[510, 770, 284, 502, 131]],
    hurt: [[1518, 774, 246, 498], [1776, 786, 248, 484]],
    knock: [[2132, 850, 460, 356]],
    downed: [[2132, 850, 460, 356]],
    land: [[2392, 144, 174, 486]],
    death: [[2626, 1146, 500, 128]],
};

// Elena no pega: su "acción" es señalar y apuntar con un objeto.
const ELENA_FRAMES = {
    idle: [[122, 46, 102, 306], [324, 46, 104, 308]],
    walk: [[830, 46, 120, 306], [1012, 44, 144, 304], [1216, 44, 132, 304], [1410, 44, 136, 304]],
    run: [[80, 450, 190, 280], [308, 452, 190, 280], [528, 450, 168, 282], [750, 450, 174, 280],
        [960, 450, 188, 272], [1180, 454, 190, 276]],
    jump: [[1804, 392, 194, 228]],
    fall: [[2036, 410, 196, 308]],
    crouch: [[1580, 494, 134, 240]],
    melee: [[136, 824, 160, 314, 48], [388, 824, 198, 314, 50], [636, 824, 186, 312, 50]],
    throw: [[636, 824, 186, 312, 50]],
    hurt: [[1960, 824, 144, 316], [2184, 828, 236, 312]],
    knock: [[872, 1228, 334, 248]],
    downed: [[1236, 1228, 334, 250]],
    land: [[2282, 500, 154, 234]],
    death: [[1964, 1368, 328, 106]],
};

// scale: altura en pantalla parecida a la de Freddy (~110 px). El resto de campos modifican a Player
// (jumps = saltos en el aire incluido el primero; dash = dash largo con poca espera).
// ultimate: transformación al llenar la barra (`name`: cartel al activarla; sin él, no hay cartel). La hoja de la ulti de Dani tiene la misma maqueta que la de Dani;
// sin `sheet` se queda con su hoja y solo cambia el aura (`aura`). `tests`: al activarla golpea a todo lo que se ve.
// spiderSense: rayitas sobre la cabeza con un bug cerca.
const CHARACTERS = {
    freddy: { name: 'Freddy', frames: FREDDY_FRAMES, scale: 0.4, desc: 'Desatascador y papel. Equilibrado' },
    dani: {
        name: 'Dani', frames: DANI_FRAMES, scale: 0.16, car: true, spiderSense: true,
        desc: 'Dash: embiste con su coche. Sentido arácnido. Ulti: más rápido, fuerte y triple salto',
        ultimate: { sheet: 'spiderdani', frames: DANI_FRAMES, speed: 4.6, jumpForce: -14.5, punch: 3, jumps: 3, car: false },
    },
    fer: { name: 'Fer', frames: FER_FRAMES, scale: 0.185, punch: 1, reach: 20, desc: 'Puñetazo más fuerte y largo' },
    guille: { name: 'Guille', frames: GUILLE_FRAMES, scale: 0.25, speed: 4.2, jumpForce: -13, desc: 'Más rápido y salta más' },
    charly: { name: 'Charly', frames: CHARLY_FRAMES, scale: 0.175, speed: 3, punch: 2, desc: 'Pega el doble de fuerte, pero es lento' },
    david: { name: 'David', frames: DAVID_FRAMES, scale: 0.2, speed: 3.2, jumpForce: -14, desc: 'Salta muchísimo, pero corre menos' },
    juancarlos: { name: 'Juan Carlos', frames: JUANCARLOS_FRAMES, scale: 0.18, reach: 40, desc: 'El puñetazo que más lejos llega' },
    sergio: { name: 'Sergio', frames: SERGIO_FRAMES, scale: 0.165, speed: 4.6, desc: 'El más rápido de todos' },
    rober: {
        name: 'Rober', frames: ROBER_FRAMES, scale: 0.188, speed: 3.9, jumpForce: -12.6,
        desc: 'Ágil. Ulti: lanza los tests contra todos los bugs a la vista',
        ultimate: { name: 'TODO EN VERDE', tests: true, punch: 2, aura: ['#43a047', '#c6ff00'] },
    },
    alvaro: { name: 'Álvaro', frames: ALVARO_FRAMES, scale: 0.175, speed: 3.8, punch: 1, desc: 'Todoterreno: corre y pega algo más' },
    tony: { name: 'Tony', frames: TONY_FRAMES, scale: 0.205, dash: true, desc: 'Dash largo y casi sin espera' },
    elena: { name: 'Elena', frames: ELENA_FRAMES, scale: 0.36, speed: 3.8, jumps: 3, desc: 'Triple salto' },
};

if (typeof module !== 'undefined') module.exports = CHARACTERS;
