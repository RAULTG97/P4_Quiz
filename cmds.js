const {log, biglog, errorlog, colorize} = require("./out");
const model = require('./model');



/**
 * Comando Help para mostrar la ayuda.
 *
 * @param rl Objeto readLine usado para implementar el CLI
 */
exports.helpCmd = rl => {
    log("Comandos:");
    log(" h|help - Muestra esta ayuda.");
    log(" list - Listar los quizzes existentes.");
    log(" show <id> - Muestra la pregunta y la respuesta el quiz indicado.");
    log(" add - Añadir un nuevo quiz interactivamente.");
    log(" delete <id> - Borrar el quiz indicado.");
    log(" edit <id> - Editar el quiz indicado.");
    log(" test <id> - Probar el quiz indicado.");
    log(" p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
    log("credits - Créditos.");
    log("q|quit - Salir del programa.");
    rl.prompt();
};


/**
 *Comando Quit para terminar el programa.
 *
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.quitCmd = rl => {
    rl.close();
};


/**
 *Comando Add. Añade un nuevo quiz al modelo.
 * Pregunta interactivamente por la pregunta y por la respuesta.
 *
 * El funcionamiento de la función rl.question es asíncrono.
 * El prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
 * es decir, la llamada a rl.prompt() se debe hacer en la callback de la segunda
 * llamada a rl.question.
 *
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.addCmd = rl => {
   rl.question(colorize('Introduzca una pregunta: ', 'red'), question => {

       rl.question(colorize('Introduzca la respuesta ', 'red'), answer => {

           model.add(question, answer);
           log(`${colorize('Se ha añadido', 'magenta')}: ${question} ${colorize('=>', 'magenta')} ${answer}`);
           rl.prompt();
       });
   });
};


/**
 *Comando List. Lista todos los quizzes existentes en el modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.listCmd = rl => {
    model.getAll().forEach((quiz, id) => {
        log(`[${colorize(id, 'magenta')}]: ${quiz.question}`);
    });

    rl.prompt();
};


/**
 *Comando Show. Muestra el quiz indicado en el parámetro: la pregunta y la respuesta.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a mostrar.
 */
exports.showCmd = (rl, id) => {
    if (typeof id === "undefined") {
        errorlog(`Falta el parámetro id.`);
    } else {
        try {
            const quiz = model.getByIndex(id);
            log(`[${colorize(id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        } catch(error) {
            errorlog(error.message);
        }
    }

    rl.prompt();
};


/**
 *Comando Test para probar un quiz del modelo. Pregunta y debemos responder.
 *
 *El funcionamiento de la función rl.question es asíncrono.
 * El prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
 * es decir, la llamada a rl.prompt() se debe hacer en la callback de la segunda
 * llamada a rl.question.
 *
 * @param rl Objeto readline usado para implementar el CLI
 * @param id Clave del quiz a probar.
 */
exports.testCmd = (rl, id) => {
    if (typeof id === "undefined") {
        errorlog(`Falta el parámetro id.`);
        rl.prompt();
    } else {
        try{
            const quiz = model.getByIndex(id);

            rl.question(colorize(`${quiz.question}?`, 'red'), answer => {
                if (answer.trim().toLowerCase() === quiz.answer.toLowerCase()){
                    log('Su respuesta es correcta.')
                    biglog('CORRECTA', 'green');
                    rl.prompt();
                } else {
                    log('Su respuesta es incorrecta.')
                    biglog('INCORRECTA', 'red');
                    rl.prompt();
                }
            });
        } catch(error){
            errorlog(error.message);
                rl.prompt();
        }
    }
};


/**
 *Comando Play para preguntar todos los quizzes existentes en el modelo en orden aleatorio.
 * Se gana si se contesta a todos satisfactoriamente.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.playCmd = rl => {
    let score = 0;   // Variable para almacenar los aciertos

    let toBeResolved = [];     //Array con los índices que faltan por preguntar

    let indices = model.count();
    for(let i=0; i<indices;i++){
        toBeResolved.push(i);
    }
        const playOne = () => {
            if (toBeResolved[0]==="undefined") {
                log("No hay nada más que preguntar.");
                log(`Fin del juego. Aciertos: ${score}`);
                biglog(`${score}`, 'green');
                rl.prompt();

            } else {
                try {
                let id = Math.trunc(Math.random() * toBeResolved.length);
                toBeResolved.splice(id,1);
                let quiz = model.getByIndex(id);
                rl.question(colorize(`${quiz.question}?`, 'red'), answer => {
                    if (answer.trim().toLowerCase() === quiz.answer.toLowerCase()) {
                        score++;
                        log(`CORRECTO - Lleva ${score} aciertos.`);
                        playOne();
                    } else {
                        log('INCORRECTO');
                        log(`Fin del juego. Aciertos: ${score}`);
                        biglog(`${score}`, 'red');
                        rl.prompt();
                    }
                });
                }catch(error) {
                    errorlog(error.message);
                    rl.prompt();
                }
            }
    }
    playOne();
};


/**
 *Comando Delete para borrar un quiz del modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI
 * @param id Clave del quiz a borrar en el modelo.
 */
exports.deleteCmd = (rl, id) => {
    if (typeof id === "undefined") {
        errorlog(`Falta el parámetro id.`);
    } else {
        try {
            model.deleteByIndex(id);
        } catch(error) {
            errorlog(error.message);
        }
    }
    rl.prompt();
};


/**
 *Comando Edit para editar un quiz en el modelo.
 *
 * El funcionamiento de la función rl.question es asíncrono.
 * EL prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
 *  es decir, la llamada a rl.prompt() se debe hacer en la callback de la segunda
 *  llamada a a rl.question.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a editar en el modelo.
 */
exports.editCmd = (rl, id) => {
    if (typeof id === "undefined") {
        errorlog(`Falta el parámetro id.`);
        rl.prompt();
    } else {
        try {
            const quiz = model.getByIndex(id);

            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)},0);

            rl.question(colorize('Introduzca una pregunta: ', 'red'), question => {

                process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)},0);

                rl.question(colorize('Introduzca la respuesta ', 'red'), answer => {
                    model.update(id, question, answer);
                    log(` Se ha cambiado el quiz ${colorize(id, 'magenta')} por: ${question} ${colorize('=>', 'magenta')} ${answer}`);
                    rl.prompt();
                });
            });
        } catch (error) {
            errorlog(error.message);
            rl.prompt();
        }
    }
};


/**
 *Comando Credits -- Muestra los creditos de la practica
 *
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.creditsCmd = rl => {
    log('RAUL', 'green');
    rl.prompt();
};