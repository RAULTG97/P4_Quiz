const {log, biglog, errorlog, colorize} = require("./out");

const {models} = require('./model');

const  Sequelize = require('sequelize');



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
 * Esta función devuelve una promesa que cuando se cumple, proporciona el texto introducido.
 * Entonces la llamada a then que hay que hacer la promesa devuelta será:
 *      .then(answer => {...})
 *
 * Tambien colorea en rojo el texto de la pregunta, elimina espacios al principio y al final.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param text Pregunta que hay que hacerle al usuario.
 */
const makeQuestion = (rl, text) => {

    return new Sequelize.Promise((resolve, reject) => {
        rl.question(colorize(text, 'red'), answer => {
            resolve(answer.trim());
        });
    });
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
    makeQuestion(rl, 'Introduzca una pregunta: ')
        .then(q => {
            return makeQuestion(rl, 'Introduzca la respuesta ')
                .then(a => {
                    return {question: q, answer: a};
                });
        })
        .then(quiz => {
            return models.quiz.create(quiz);
        })
        .then((quiz) => {
            log(`${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog('El quiz es erroneo: ');
            error.errors.forEach(({message}) => errorlog(message));
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};


/**
 *Comando List. Lista todos los quizzes existentes en el modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.listCmd = rl => {
    models.quiz.findAll()
        .each(quiz => {
                log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};


/**
 * Esta funcion devuelve una promesa que:
 *  -Valida que se ha introducido un valor para el parametro.
 *  -Convierte el parametro en un numero entero.
 * Si va bien, la promesa se satisface y devuelve el valor de id a usar.
 *
 * @param id Parametro con el índice a validar.
 */
const validateId = id => {

    return new Sequelize.Promise((resolve, reject) => { //Usamos las promesas de Sequelize
        if (typeof id === "undefined") {
            reject(new Error(`Falta el parametro <id>.`));
        } else {
            id = parseInt(id); //coger la parte entera y descartar lo demas
            if (Number.isNaN(id)) {
                reject(new Error(`El valor del parametro <id> no es un número`));
            } else {
                resolve(id);
            }
        }
    });
};


/**
 *Comando Show. Muestra el quiz indicado en el parámetro: la pregunta y la respuesta.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a mostrar.
 */
exports.showCmd = (rl, id) => {
    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if (!quiz) {
                throw new Error(`No existe un quiz asociado al id=${id}.`);
            }
            log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
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
    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if (!quiz) {
                throw new Error(`No existe un quiz asociado al id=${id}.`);
            }
            return makeQuestion(rl, quiz.question)
                .then(a => {
                    if (a.trim().toLowerCase() === quiz.answer.trim().toLowerCase()) {
                        log('Su respuesta es correcta.')
                        biglog('CORRECTA', 'green');
                        rl.prompt();
                    } else {
                        log('Su respuesta es incorrecta.')
                        biglog('INCORRECTA', 'red');
                        rl.prompt();
                    }
                });
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
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
        toBeResolved.push(model.getByIndex(i)); //Rellenamos el array a resolver con los quizzes
    }
    const playOne = () => { //Función para ir preguntando todos los quizzes
        if (toBeResolved.length===0) {  //Si no quedan preguntas(se han preguntado todas)--- Fin del juego
            log("No hay nada más que preguntar.");
            log(`Fin del juego. Aciertos: ${score}`);
            biglog(`${score}`, 'magenta');
            rl.prompt();

        } else {
            try {
                let id = Math.trunc(Math.random() * toBeResolved.length); //Obtenemos un indice al azar
                let quiz = toBeResolved[id];
                toBeResolved.splice(id,1);
                rl.question(colorize(`${quiz.question}? `, 'red'), answer => { //Pregunta al azar
                    if (answer.trim().toLowerCase() === quiz.answer.trim().toLowerCase()) {
                        score++;
                        log(`CORRECTO - Lleva ${score} aciertos.`);
                        playOne();
                    } else {
                        log('INCORRECTO');
                        log(`Fin del juego. Aciertos: ${score}`);
                        biglog(`${score}`, 'magenta');
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
    validateId(id)
        .then(id => models.quiz.destroy({where: {id}}))
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
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
    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if(!quiz) {
                throw new Error(`No existe un quiz asociado al id=${id}.`);
            }

            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)},0);
            return makeQuestion(rl, 'Introduzca la pregunta: ')
                .then(q => {
                    process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)},0);
                    return makeQuestion(rl, 'Introduzca la respuesta ')
                        .then(a => {
                            quiz.question = q;
                            quiz.answer = a;
                            return quiz;
                        });
                });
        })
        .then(quiz => {
            return quiz.save();
        })
        .then(quiz => {
            log(` Se ha cambiado el quiz ${colorize(id, 'magenta')} por: ${question} ${colorize('=>', 'magenta')} ${answer}`);
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog('El quiz es erroneo: ');
            error.errors.forEach(({message}) => errorlog(message));
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
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