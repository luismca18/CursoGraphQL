const Usuario =require('../models/Usuario');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
const bcryptjs=require('bcryptjs');
const jwt=require('jsonwebtoken');

require('dotenv').config({path:'variables.env'});


const crearToken=(usuario,secreta,expiresIn)=>{
    //console.log(usuario);
    const { id, email, nombre, apellido } =usuario;
    return jwt.sign({id,email,nombre,apellido},secreta,{expiresIn});
}   
//resolvers
const resolvers={
    Query:{
        obtenerUsuario: async (_,{token})=>{
            const usuarioId=await jwt.verify(token, process.env.SECRETA);
            return usuarioId;
        },
        obtenerProductos: async ()=>{
            try{
                const productos=await Producto.find({});
                return productos;
            }catch(error){
                console.log(error);
            }
        },
        obtenerProducto:async(_,{id})=>{
            //revisar si el producto existe o no
            const producto=await Producto.findById(id);

            if(!producto){
                throw new Error('Producto no encontrado');
            }
            return producto;
        },
        obtenerClientes: async()=>{
            try{
                const clientes=await Cliente.find({});
                return clientes;
            }catch(error){
                console.log(error);
            }
        },
        obtenerClientesVendedor:async(_,{},ctx)=>{
            try{
                const clientes=await Cliente.find({vendedor:ctx.usuario.id.toString()});
                return clientes;
            }catch(error){
                console.log(error);
            }
        },
        obtenerCliente:async(_,{id},ctx)=>{
            //Revisar si el cliente existe o no
            const cliente=await Cliente.findById(id);

            if(!cliente){
                throw new Error ('Cliente no encontrado');
            }

            //quien creo el cliente puede verlo
            if (cliente.vendedor.toString()!==ctx.usuario.id){
                throw new Error ('no tienes las credenciales');
            }
            return cliente;
        }
    },
    Mutation:{
        nuevoUsuario: async(_,{input})=>{
           
           const {email,password}= input;
            //Revisar si el usuario ya esta registrado
            const existeUsuario = await Usuario.findOne({email});
            if(existeUsuario){
                throw new Error('El usuario ya esta registrado');
            }
           //console.log(existeUsuario);
           //Hashear su password
           const salt= await bcryptjs.genSalt(10);
           input.password=await bcryptjs.hash(password,salt);

           
           try{
                //Guardar en la BD
                const usuario =new Usuario(input);
                usuario.save(); //guardarlo
                return usuario;
           }catch(error){
            console.log(error);
           }
        },
        autenticarUsuario: async(_,{input})=>{
            const {email,password}=input;
            // si el usuario existe
            const existeUsuario=await Usuario.findOne({email});
            if(!existeUsuario){
                throw new Error('El usuario no existe');
            }
            // Revisar si el password es correcto
            const passwordCorrecto=await bcryptjs.compare(password, existeUsuario.password);
            if(!passwordCorrecto){
                throw new Error('El Password es incorrecto');
            }
            //Crear el token
            return{
                token: crearToken(existeUsuario, process.env.SECRETA,'24h')
            }
        },
        nuevoProducto: async (_,{input})=>{
            try{
                const producto=new Producto(input);
                //almacenar en la bd
                const resultado=await producto.save();
                return resultado;
            }catch(error){
                console.log(error);
            }
        },
        actualizarProducto: async (_,{id,input})=>{
            //revisar si el producto existe o no
            let producto=await Producto.findById(id);

            if(!producto){
                throw new Error('Producto no encontrado');
            }

            //guardar en la base de datos
            producto=await Producto.findOneAndUpdate({ _id:id},input,{new:true});
            return producto;
        },
        eliminarProducto: async(_,{id})=>{
            //revisar si el producto existe o no
            let producto=await Producto.findById(id);

            if (!producto){
                throw new Error('Producto no encontrado');
            }
            //Eliminar
            await Producto.findOneAndDelete({_id:id});
            return "Producto elminado";
        },
        nuevoCliente:async(_, { input }, ctx)=>{
            console.log(ctx.usuario.id);
            const {email}=input;
            //verificar si el cliente ya esta registrado
            const cliente=await Cliente.findOne({email});
            if(cliente){
                throw new Error('El cliente ya esta registrado');
            }
            const nuevoCliente =new Cliente(input);
            nuevoCliente.vendedor=ctx.usuario.id;
           try{
                //Guardar en la BD
                
                const resultado=nuevoCliente.save(); //guardarlo
                
                return resultado;
           }catch(error){
            console.log(error);
           }

            
        }
    }
}

module.exports=resolvers;