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

// Por personaje: lema para la selección, lo que dice antes de cada nivel (índice = nivel), su final y,
// en `rival`, lo que suelta al aparecer como jefe rival ({player} = nombre de quien juegas).
// Va ligado a su papel en la empresa y a su forma de jugar (CHARACTERS): la historia explica sus fuertes.
const CHARACTER_STORY = {
    freddy: {
        motto: 'Exiliado en los submundos de Core, donde las consultas tardan minutos y los logs no los lee ' +
            'nadie. Ni el más rápido ni el que más pega, pero tira papel desde lejos y su desatascador ' +
            'ha visto cosas que ningún ORM debería ver.',
        rival: [
            '¿{player}? Llevo años en los submundos de Core. Esto no es nada.',
            'Este baño es zona back-end. Aquí mando yo.',
            'Tranquilo, {player}: el desatascador no duele... mucho.',
        ],
        levels: [
            'Solo quería cinco minutos de paz. Ahora es personal.',
            'He subido desde los submundos de Core. Un servidor más no me asusta.',
            'Si no encuentro la página, la página me encontrará a mí.',
            'He desatascado consultas peores. Creo.',
            'Espagueti o no, en Core he visto código más enredado.',
        ],
        ending: 'Freddy cuelga el desatascador en la pared y baja de nuevo a los submundos de Core. ' +
            'Allí abajo nadie lo sabe, pero producción funciona gracias a él.',
    },
    dani: {
        motto: 'Cuando un proyecto se tuerce, Dani no manda un correo: llega en coche, y lo que se pone por delante ' +
            'deja de ser un problema. Su sentido arácnido le avisa de cada bug antes de que nadie lo vea.',
        rival: [
            'Me ha llegado que hay un problema, {player}. Ya estoy aquí.',
            'Mi sentido arácnido no falla. Y ahora mismo me está señalando a ti.',
            'Esto no está saliendo como habíamos planificado, {player}. Arranco el coche.',
        ],
        levels: [
            'Me ha cosquilleado la nuca. Hay bugs en el baño.',
            'Si esto se complica, me pongo el traje. Un gran poder conlleva un gran deploy.',
            '¿Páginas perdidas? Las encuentro antes de que nadie abra la incidencia.',
            '¿Una riada? Perfecto, el coche necesitaba un lavado.',
            'Sentido arácnido a tope: ese Bug Araña huele a código legacy.',
        ],
        ending: 'Dani aparca frente a producción, cuelga el traje en la silla y cierra la ' +
            'incidencia: «Resuelto». Nadie pregunta cómo. Nadie se atreve.',
    },
    fer: {
        motto: 'Está en todos los proyectos a la vez: abras el repositorio que abras, hay un commit suyo. ' +
            'Por eso su puñetazo llega más lejos y pega más fuerte que el de Freddy: lleva años tocándolo todo, ' +
            'y lo que toca queda bonito.',
        rival: [
            '¿Qué haces aquí, {player}? Este proyecto también es mío.',
            'Estoy en todos los repositorios. Y ahora, en tu camino.',
            'Te voy a maquetar la cara. Responsive.',
        ],
        levels: [
            'Otro proyecto más. Ya iba siendo hora de que me llamasen.',
            'El servidor central también tiene front. Y lo hice yo.',
            '¿Un 404? Esa página la maqueté yo. Algo han roto.',
            'Riada en el back, glitches en el front. Lo de siempre.',
            'Código Espagueti: seguro que hay un CSS mío por ahí dentro.',
        ],
        ending: 'Fer cierra el último bug y abre otros tres proyectos a la vez. Mañana tendrá commits en todos.',
    },
    guille: {
        motto: 'Del botón a la base de datos y vuelta, sin pedir ayuda a nadie. Va tan deprisa de arriba ' +
            'abajo que corre y salta más que Freddy. Además sabe quién hizo aquel push a producción un viernes ' +
            'a las 18:59... y no piensa decirlo. Todavía.',
        rival: [
            'Sé quién hizo el push del viernes, {player}. ¿Quieres saberlo? Gáname primero.',
            'Arriba, abajo, por dentro... y ahora, tú.',
            'Te gano por arriba y por abajo, {player}. Elige.',
        ],
        levels: [
            'Push a producción un viernes... ya sé quién ha sido. Luego hablamos.',
            'Del front al servidor central: me conozco cada capa.',
            'Si la página no está en el front, estará en el back. La encuentro.',
            'Que suba el agua. Yo ya estoy en la capa de arriba.',
            'Espagueti en todas las capas. Por suerte, yo también estoy en todas.',
        ],
        ending: 'Guille despliega el arreglo de punta a punta, front y back en el mismo commit. ' +
            'Producción vuelve a funcionar y el secreto del viernes sigue a salvo.',
    },
    charly: {
        motto: 'Camina despacio porque viene de tres reuniones seguidas, pero cada golpe suyo vale por dos: ' +
            'conoce LeadCars por dentro, de la planificación a la última consulta, y sabe exactamente ' +
            'dónde duele.',
        rival: [
            'Esto no estaba en la planificación, {player}.',
            'Acabo de salir de una reunión. No me hagas entrar en otra.',
            'Tú eres un bloqueo, {player}. Y los bloqueos se quitan.',
        ],
        levels: [
            'He movido la reunión de las diez. Esto es prioritario.',
            'Cada escalón hacia el servidor es un ticket que cierro.',
            'Una página perdida es una funcionalidad sin entregar. Inaceptable.',
            'La riada corre más que yo. Por eso no pienso pararme.',
            'Último sprint. Que lo sepa el espagueti.',
        ],
        ending: 'Charly marca la tarea como hecha en el tablero, mueve el resto al siguiente sprint ' +
            'y, por una vez, la reunión de seguimiento dura cinco minutos.',
    },
    david: {
        motto: 'Tiene un agente para cada cosa y medio decorado de este juego salió de un prompt suyo. ' +
            'Salta como nadie porque ya sabe dónde está cada plataforma, pero corre menos: siempre va ' +
            'esperando a que termine de responder el modelo.',
        rival: [
            'Le he pedido a la IA que te derrote, {player}. Dice que es fácil.',
            'Tengo un agente analizándote. Ya conozco tus patrones.',
            'Prompt: «Elimina a {player}». Ejecutando...',
        ],
        levels: [
            'Le he preguntado a la IA dónde están los bugs. Me ha dado una lista.',
            'Este servidor lo monté yo. Bueno, mi agente.',
            '¿Páginas que desaparecen? Alucinaciones. Las conozco bien.',
            'La riada viene por abajo. El modelo dice que vaya por arriba.',
            'Código Espagueti... juraría que esto no lo generé yo.',
        ],
        ending: 'David le pide a la IA un resumen de la incidencia. Tres párrafos, sin errores, ' +
            'y una sugerencia: «La próxima vez, no despliegues en viernes».',
    },
    juancarlos: {
        motto: 'Lo intenta con más ganas que nadie, y lo que no arregla con código lo arregla señalando ' +
            'desde lejos: tiene el alcance más largo del equipo. Si un bug se escapa, él ya lo ha apuntado ' +
            'en el roadmap.',
        rival: [
            '{player}, esto no es lo que pidió el cliente.',
            'He hecho un curso de programación. Prepárate.',
            'Esto lo hablamos en la próxima demo. Bueno, mejor ahora.',
        ],
        levels: [
            'Puede que no sepa dónde está el bug, pero sé dónde le duele al usuario.',
            'Desde aquí llego. Tengo visión de conjunto.',
            'Una página que no existe es una oportunidad de negocio.',
            'La riada no estaba en el roadmap. Improvisamos.',
            'El Código Espagueti tiene muchas patas. Mi lista de requisitos, más.',
        ],
        ending: 'Juan Carlos cierra el bug, actualiza el roadmap y abre un ticket nuevo: ' +
            '«Que no vuelva a pasar». Prioridad: altísima.',
    },
    sergio: {
        motto: 'Se pasa cada nivel como un speedrun: se sabe los saltos, los atajos y hasta los frames de ' +
            'invencibilidad. Es el más rápido de todos, y si no le ves venir es que ya ha pasado.',
        rival: [
            'Esta pelea me la sé de memoria, {player}. Any% sin daño.',
            'Ya estoy aquí. Ah, que tú acabas de llegar, {player}.',
            'Jefe final desbloqueado: yo.',
        ],
        levels: [
            'Nivel 1. Cronómetro en marcha.',
            'Hay un atajo por ahí arriba. Siempre lo hay.',
            '¿Error 404? Me lo he saltado con un clip.',
            'La riada es solo un temporizador. Y voy por delante.',
            'Jefe final. He visto todas sus fases en YouTube.',
        ],
        ending: 'Sergio para el cronómetro: récord personal. Producción vuelve a funcionar ' +
            'y él ya está buscando un atajo más.',
    },
    rober: {
        motto: 'Roberto, el rey de los tests unitarios. Ningún bug sobrevive a su cobertura: ágil, rápido y ' +
            'saltarín, y con la barra llena lanza toda la batería de tests de golpe. Cada bug que tenga ' +
            'a la vista se pone en rojo... y cae.',
        rival: [
            '{player}, tienes cero tests. Esto va a fallar.',
            'Assert: {player} pierde. Ejecutando...',
            'Mi cobertura es del 100 %. La tuya, de ninguna.',
        ],
        levels: [
            'Un viernes a las 18:59... y sin tests. Tenía que ser hoy.',
            'Cada bug que tumbo, un test nuevo para que no vuelva.',
            '¿Un 404? Eso lo habría pillado un test de integración.',
            'Que suene la cisterna. Mis tests corren más rápido.',
            'Código Espagueti: imposible de testear. Lo tumbo a mano.',
        ],
        ending: 'Rober añade un último test, lo ve pasar en verde y sonríe. ' +
            'Ese bug no volverá: ahora está cubierto.',
    },
    alvaro: {
        motto: 'La gran promesa de la programación, exiliado en el departamento de soporte. Se pasa el día ' +
            'arreglando lo que otros rompen, así que sabe un poco de todo: corre y pega algo más que Freddy ' +
            'y no tiene ningún punto débil. Solo le falta que le dejen programar.',
        rival: [
            '¿Has abierto un ticket, {player}? Pues ya está resuelto.',
            'Llevo meses en soporte esperando esto.',
            'Un día seré programador. Hoy te ganaré a ti.',
        ],
        levels: [
            'Otro ticket urgente. Este por lo menos tiene acción.',
            'Desde soporte se ve todo lo que falla. Y falla mucho.',
            '¿Página no encontrada? Me lo dicen veinte clientes al día.',
            'Agua, glitches, fuego... un día normal en soporte.',
            'Si arreglo esto, igual me dejan programar.',
        ],
        ending: 'Álvaro cierra el último ticket. Nadie le ha dado las gracias, pero alguien ha visto ' +
            'cómo lo hacía. Quizá el próximo commit sea suyo.',
    },
    tony: {
        motto: 'De vez en cuando se asoma por LeadCars a echar una mano. Aparece y desaparece: su dash es el ' +
            'más largo y casi no necesita espera. Cuando llega, resuelve, y antes de que le des las gracias ' +
            'ya ha vuelto a OCS.',
        rival: [
            'Pasaba por aquí desde OCS, {player}. Mala suerte.',
            'En OCS esto lo resolvemos en un momento.',
            'Ahora me ves, {player}. Ahora estoy en otro proyecto.',
        ],
        levels: [
            'Vengo un momento desde OCS. Solo un momento.',
            'Esto en OCS ya nos pasó. Sé por dónde va.',
            'Las páginas perdidas siempre están donde menos miras.',
            'Contra la riada: dash, dash y vuelta a OCS.',
            'Este espagueti me suena. Creo que lo vi en otro proyecto.',
        ],
        ending: 'Tony deja la solución documentada y vuelve a OCS. En LeadCars solo queda ' +
            'una nube de polvo y un servidor que funciona.',
    },
    elena: {
        motto: 'Ve un píxel fuera de sitio a cinco pantallas de distancia, y su triple salto la lleva a ' +
            'plataformas que nadie más alcanza. No le hace falta pegar fuerte: señala lo que no encaja ' +
            'y el bug, avergonzado, desaparece.',
        rival: [
            '{player}, eso no está en el diseño.',
            'Ese margen no es de 8 píxeles. Y eso se paga.',
            'Yo no pego. Señalo. Y te estoy señalando a ti.',
        ],
        levels: [
            'Un bug en el baño. Ni siquiera combina con los azulejos.',
            'Un salto, dos saltos, tres saltos. El servidor está más cerca de lo que parece.',
            'Una página que no existe es un diseño que nadie respetó.',
            'La riada no llega tan alto como mi tercer salto.',
            'Código Espagueti: ni una guía de estilos, ni un componente reutilizado.',
        ],
        ending: 'Elena repasa producción píxel a píxel: todo alineado, todo en su sitio. ' +
            'Deja un último comentario en el diseño: «Así, sí».',
    },
};

if (typeof module !== 'undefined') module.exports = { STORY, ENDING, CHARACTER_STORY };
