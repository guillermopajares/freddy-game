// Viñetas de texto antes de cada nivel (índice = nivel) y al ganar.
const STORY = [
    'Freddy solo quería ir al baño. Pero alguien hizo push a producción un viernes a las 18:59 ' +
        'y los bugs han salido por el desagüe. Desatascador en mano y papel en la mochila: hay que limpiar esto.',
    'Los bugs trepan hacia el servidor central. Cuanto más alto suben, más se reproducen. ' +
        'Al fondo se oye algo grande arrastrando un teclado...',
    'Las páginas desaparecen una tras otra. Error 404 por todas partes. ' +
        'Dicen que hay uno tan grande que ya nadie recuerda qué buscaba.',
    'El desagüe está a punto de reventar. Cuando suena la cisterna, corre: ' +
        'la riada no espera a nadie y en el fondo algo parpadea entre glitches.',
    'El origen de todo: un Bug Araña alimentado con años de código sin revisar. ' +
        'Si lo dejas crecer, se convertirá en Código Espagueti. Último rollo, último esfuerzo.',
];

const ENDING = 'El código está limpio, el baño desatascado y producción vuelve a funcionar. ' +
    'Freddy por fin puede sentarse tranquilo... hasta el próximo despliegue en viernes.';

// Lo que cada personaje dice antes de cada nivel (índice = nivel), su lema para la selección y su final.
// Va ligado a su forma de jugar (CHARACTERS): así la historia también explica sus fuertes.
const CHARACTER_STORY = {
    freddy: {
        motto: 'El elegido del desatascador. Ni muy rápido ni muy fuerte: siempre cumple.',
        levels: [
            'Solo quería cinco minutos de paz. Ahora es personal.',
            'Rollo a rollo, bug a bug. Como siempre: lo arreglo yo.',
            'Si no encuentro la página, la página me encontrará a mí.',
            'He desatascado cosas peores. Creo.',
            'Espagueti o no, este desatascador ya ha visto de todo.',
        ],
        ending: 'Freddy cuelga el desatascador en la pared, junto al de oro. Nadie sabe de dónde salió ' +
            'aquel bug... pero él sí sabe quién hizo el push.',
    },
    dani: {
        motto: 'Llega antes que nadie: en coche, claro. Y si se pone serio, se pone el traje.',
        levels: [
            '¿Bugs en el baño? Les paso por encima con el coche y luego hago la code review.',
            'Si esto se complica, me pongo el traje. Un gran poder conlleva un gran deploy.',
            '¿404? Yo sé llegar a todas partes: tengo GPS.',
            '¿Una riada? Perfecto, el coche necesitaba un lavado.',
            'Spider-sentido activado: ese Bug Araña huele a código legacy.',
        ],
        ending: 'Dani deja el coche en doble fila frente a producción, cuelga el traje de Spider Dani en la ' +
            'silla y cierra la incidencia: «Resuelto. No preguntéis cómo».',
    },
    fer: {
        motto: 'Un puñetazo, un bug menos. Pega más fuerte y más lejos que Freddy.',
        levels: [
            'No he venido a refactorizar. He venido a pegar.',
            'Cuanto más grandes, más fuerte caen.',
            'Un 404 gigante solo es un saco de boxeo más grande.',
            'Que suene la cisterna. Yo no corro: ellos huyen.',
            'Espagueti al dente: voy a ablandarlo a puñetazos.',
        ],
        ending: 'Fer se sacude los nudillos. El Código Espagueti ha quedado en tallarines y el servidor ' +
            'central, por fin, en silencio.',
    },
    guille: {
        motto: 'Rápido y saltarín: los bugs no le ven venir.',
        levels: [
            'Push a producción un viernes... ya sé quién ha sido. Luego hablamos.',
            'Arriba del todo hay un rey. Llegaré antes de que se ponga la corona.',
            'Las páginas perdidas no corren tanto como yo.',
            'Riada a la vista: el mejor momento para batir mi récord.',
            'Último nivel. Si me doy prisa, llego a cenar.',
        ],
        ending: 'Guille cruza la última puerta con tiempo de sobra. Producción vuelve a funcionar y él ya ' +
            'está pensando cómo bajar su récord.',
    },
    charly: {
        motto: 'Lento, pero cuando pega, pega el doble.',
        levels: [
            'Sin prisa. Los bugs ya vendrán solos hacia mí.',
            'Cada escalón hacia el servidor es un bug que no se levanta.',
            'Un golpe bien dado vale por dos. Y yo solo doy de esos.',
            'La riada corre más que yo. Por eso no pienso pararme.',
            'Al final el más grande cae igual que el más pequeño: de un golpe.',
        ],
        ending: 'Charly llega el último a la fiesta del despliegue, pero nadie se queja: fue él quien dejó ' +
            'al Código Espagueti fuera de combate.',
    },
    david: {
        motto: 'Salta como nadie y conoce cada rincón del decorado. Eso sí, corre menos.',
        levels: [
            'Este baño lo pinté yo. No pienso dejar que lo llenen de bugs.',
            'Desde ahí arriba se ve todo el servidor. Y todos los atajos.',
            '¿Páginas que desaparecen? Mientras quede una plataforma, yo llego.',
            'La riada viene por abajo. Yo voy por arriba.',
            'He dibujado cada píxel de este mundo. El espagueti sobra.',
        ],
        ending: 'David repasa el decorado: ni una baba, ni un 404. Retoca un último píxel del baño y lo da ' +
            'por terminado... hasta la próxima versión.',
    },
    juancarlos: {
        motto: 'El brazo más largo de la oficina: pega desde donde nadie llega.',
        levels: [
            'A mí no se me acerca un bug ni a un metro. Literalmente.',
            'Desde aquí llego. Y desde allí también.',
            'Si el 404 no sabe lo que busca, ya le busco yo a él.',
            'Que venga el agua: la distancia de seguridad es lo mío.',
            'Las patas del Bug Araña son largas. Mi brazo, más.',
        ],
        ending: 'Juan Carlos estira la espalda (y el brazo) delante del servidor limpio. Los bugs han ' +
            'aprendido a guardar las distancias.',
    },
    sergio: {
        motto: 'El más rápido de todos. Punto.',
        levels: [
            'Los bugs aún se están atando los zapatos y yo ya he llegado.',
            '¿Escaleras hasta el servidor? De dos en dos. De tres en tres.',
            '¿Error 404? He pasado tan rápido que no me ha dado tiempo a perderme.',
            '¿Una riada? Que me pille, si puede.',
            'Último nivel. Cronómetro en marcha.',
        ],
        ending: 'Sergio para el cronómetro: récord personal. Producción vuelve a funcionar antes de que ' +
            'nadie se diera cuenta de que estaba caída.',
    },
    rober: {
        motto: 'Ágil: un poco más rápido y un poco más alto que el resto.',
        levels: [
            'Un viernes a las 18:59... tenía que ser hoy.',
            'Plataforma, salto, bug. Plataforma, salto, bug. Me sé el ritmo.',
            'Ni las páginas perdidas se escapan de alguien tan ágil.',
            'La cisterna suena. Mis piernas ya iban antes.',
            'Que se prepare el espagueti: esquivar, saltar, rematar.',
        ],
        ending: 'Rober aterriza sobre el último bug con una pirueta. Nadie lo grabó, pero jura que fue perfecta.',
    },
    alvaro: {
        motto: 'Todoterreno: corre y pega algo más que Freddy. Sirve para todo.',
        levels: [
            'Un poco de todo y nada de miedo. Vamos allá.',
            'Correr, pegar, trepar. Para esto hay que ser todoterreno.',
            'Ni muy rápido ni muy lento: justo a tiempo para encontrar esa página.',
            'Agua, glitches, fuego... un día normal en producción.',
            'El espagueti tiene muchas patas. Yo, muchos recursos.',
        ],
        ending: 'Álvaro hace balance: bugs eliminados, servidor estable, baño operativo. Todo en orden. ' +
            'Mañana, a por las incidencias de siempre.',
    },
    tony: {
        motto: 'Aparece y desaparece: dash largo y casi sin espera.',
        levels: [
            'Un dash y ya estoy en el baño. Otro, y fuera bugs.',
            'El Rey Bug me oirá llegar. O no: voy demasiado rápido.',
            'Me muevo tan rápido que los 404 creen que soy otro error.',
            'Contra la riada: dash, dash y más dash.',
            'El Bug Araña teje redes. Yo las atravieso.',
        ],
        ending: 'Tony frena por primera vez en todo el día. Producción vuelve a funcionar y lo único que ' +
            'queda de él es una nube de polvo.',
    },
    elena: {
        motto: 'Triple salto: donde no llega nadie, llega ella. No pega, señala, y el bug desaparece.',
        levels: [
            'Yo no pego: señalo el bug y el bug desaparece.',
            'Un salto, dos saltos, tres saltos. El servidor está más cerca de lo que parece.',
            'Si nadie encuentra la página, la encontraré yo. Desde el aire.',
            'La riada no llega tan alto como mi tercer salto.',
            'Código sin revisar... Esto lo habría pillado yo en la code review.',
        ],
        ending: 'Elena cierra la última incidencia y deja un comentario en el commit del viernes: ' +
            '«La próxima vez, tests». El servidor, limpio, parece darle la razón.',
    },
};

if (typeof module !== 'undefined') module.exports = { STORY, ENDING, CHARACTER_STORY };
