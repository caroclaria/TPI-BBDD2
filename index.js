import { MongoClient, ObjectId } from 'mongodb';

// Reemplaza esto con tu cadena de conexión real de MongoDB Atlas
const URL = process.env.DATABASE_URL; 
const client = new MongoClient(URL);
const DATABASE_NAME = 'prepaga_db';

        //Bloque 1
        /**
 * 1. CREATE (Inserción)
 * Inserta un documento en la colección indicada, asegurando su estado activo.
 */
async function crearDocumento(db, nombreColeccion, nuevoDocumento) {
    const coleccion = db.collection(nombreColeccion);
    
    const documentoEstructurado = {
        ...nuevoDocumento,
        fechaAlta: new Date(),
        fechaBaja: null,
        activo: true // Regla de negocio inicial
    };

    const resultado = await coleccion.insertOne(documentoEstructurado);
    console.log(`✨ [CREATE] Éxito en '${nombreColeccion}'. ID: ${resultado.insertedId}`);
    return resultado.insertedId;
}

/**
 * 2. READ (Lectura con Baja Lógica)
 * Trae solo los documentos donde activo sea true (ignora los eliminados lógicamente).
 */
async function leerDocumentosActivos(db, nombreColeccion, filtro = {}) {
    const coleccion = db.collection(nombreColeccion);
    
    // Forzamos que solo traiga los registros que NO tengan baja lógica
    const filtroConBajaLogica = {
        ...filtro,
        activo: true
    };

    const documentos = await coleccion.find(filtroConBajaLogica).toArray();
    console.log(`📖 [READ] Se encontraron ${documentos.length} documentos activos en '${nombreColeccion}'.`);
    return documentos;
}

/**
 * 3. UPDATE (Modificación de campos específicos)
 */
async function actualizarDocumento(db, nombreColeccion, idString, camposAActualizar) {
    const coleccion = db.collection(nombreColeccion);
    
    const resultado = await coleccion.updateOne(
        { _id: new ObjectId(idString) },
        { $set: camposAActualizar }
    );

    console.log(`✏️ [UPDATE] Documento modificado en '${nombreColeccion}'. Modificados: ${resultado.modifiedCount}`);
    return resultado.modifiedCount;
}

/**
 * 4. DELETE (Baja Lógica)
 * No borra el registro, cambia 'activo' a false y setea la 'fechaBaja'.
 */
async function eliminarDocumentoLgico(db, nombreColeccion, idString) {
    const coleccion = db.collection(nombreColeccion);
    
    const resultado = await coleccion.updateOne(
        { _id: new ObjectId(idString) },
        { 
            $set: { 
                activo: false, 
                fechaBaja: new Date() 
            } 
        }
    );

    console.log(`🗑️ [DELETE LÓGICO] Documento desactivado en '${nombreColeccion}'. Modificados: ${resultado.modifiedCount}`);
    return resultado.modifiedCount;
}


// 🕹️ BLOQUE DE EJECUCIÓN (PROBAMOS TODO EL FLUJO)
// =========================================================================
async function main() {
    try {
        await client.connect();
        const db = client.db(DATABASE_NAME);
        console.log("--- INICIANDO PRUEBAS DEL CRUD GENÉRICO ---");

        // -----------------------------------------------------------------
        // PRUEBA 1: CREATE en la colección 'prestadores'
        // -----------------------------------------------------------------
        const nuevoPrestador = {
            nombre: "Carlos",
            apellido: "Pérez",
            matricula: "MN 99999",
            especialidad: "Cardiología"
        };
        const idGenerado = await crearDocumento(db, 'prestadores', nuevoPrestador);


        // -----------------------------------------------------------------
        // PRUEBA 2: READ de la colección 'prestadores' (Debería mostrar a Carlos)
        // -----------------------------------------------------------------
        const prestadoresActivos = await leerDocumentosActivos(db, 'prestadores');
        console.log("Lista de prestadores activos:", prestadoresActivos);


        // -----------------------------------------------------------------
        // PRUEBA 3: UPDATE en 'prestadores' (Cambiamos la especialidad de Carlos)
        // -----------------------------------------------------------------
        await actualizarDocumento(db, 'prestadores', idGenerado.toString(), { especialidad: "Cardiología Infantil" });


        // -----------------------------------------------------------------
        // PRUEBA 4: DELETE LÓGICO (Desactivamos a Carlos)
        // -----------------------------------------------------------------
        await eliminarDocumentoLgico(db, 'prestadores', idGenerado.toString());


        // -----------------------------------------------------------------
        // PRUEBA 5: READ FINAL (Comprobamos que ya NO aparece Carlos por la baja lógica)
        // -----------------------------------------------------------------
        console.log("\n--- Verificación final de lectura tras la baja lógica ---");
        const prestadoresPostBaja = await leerDocumentosActivos(db, 'prestadores');
        console.log("Prestadores activos remanentes:", prestadoresPostBaja);

    } catch (error) {
        console.error("Error en el proceso:", error);
    } finally {
        await client.close();
        console.log("Conexión cerrada.");
    }
}
main();