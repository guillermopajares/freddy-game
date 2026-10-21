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

// scale: altura en pantalla parecida a la de Freddy (~110 px). El resto de campos modifican a Player.
const CHARACTERS = {
    freddy: { name: 'Freddy', frames: FREDDY_FRAMES, scale: 0.4, desc: 'Desatascador y papel. Equilibrado' },
    dani: { name: 'Dani', frames: DANI_FRAMES, scale: 0.16, car: true, desc: 'Dash: embiste con su coche' },
    fer: { name: 'Fer', frames: FER_FRAMES, scale: 0.185, punch: 1, reach: 20, desc: 'Puñetazo más fuerte y largo' },
    guille: { name: 'Guille', frames: GUILLE_FRAMES, scale: 0.25, speed: 4.2, jumpForce: -13, desc: 'Más rápido y salta más' },
};
