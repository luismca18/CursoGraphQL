//resolvers
const resolvers={
    Query:{
        obtenerCurso: ()=>"Algo"
    },
    Mutation:{
        nuevoUsuario:(_,{input})=>{
            console.log(input);
            return "Creando ..."
        }
    }
}

module.exports=resolvers;