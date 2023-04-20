const Usuario =require('../models/Usuario');
const Producto = require('../models/Producto');
const Pedido = require('../models/Pedido');
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
        },
        obtenerPedidos:async ()=>{
            try{
                const pedidos=await Pedido.find({});
                return pedidos;
            }catch (error){
                console.log(error)
            }
        },
        obtenerPedidosVendedor:async (_,{},ctx)=>{
            try{
                const pedidos=await Pedido.find({vendedor:ctx.usuario.id});
                return pedidos;
            }catch (error){
                console.log(error)
            }
        },
        obtenerPedido:async (_,{id},ctx)=>{
            // si el pedido existe o no
            const pedido=await Pedido.findById(id);
            if(!pedido){
                throw new Error('Pedido no encontrado')
            }
            //solo el que lo creo lo puede ver
            if(pedido.vendedor.toString()!==ctx.usuario.id){
                throw new Error('No tienes las credenciales')
            }
            //retorna el resultado
            return pedido;
        },
        obtenerPedidosEstado:async(_,{estado},ctx)=>{
            const pedidos=await Pedido.find({vendedor:ctx.usuario.id, estado});
            return pedidos;
        },
        mejoresClientes:async()=>{
            const clientes=await Pedido.aggregate([
                {$match:{estado:"COMPLETADO"}},
                {$group:{
                    _id:"$cliente",
                    total: {$sum:'$total'}
                }},
                {
                    $lookup:{
                        from:'clientes',
                        localField:'_id',
                        foreingField:"_id",
                        as:"clientes"
                    }
                }
            ]);
            return clientes
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
                token: crearToken(existeUsuario, process.env.SECRETA,'7d')
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
        },
        actualizarCliente:async(_,{id,input},ctx)=>{
            //verificar si existe o no
            let cliente =await Cliente.findById(id);

            if(!cliente){
                throw new Error ('Ese cliente no existe');
            }

            //Verificar si el vendedor es quien edita
            if (cliente.vendedor.toString()!==ctx.usuario.id){
                throw new Error ('no tienes las credenciales');
            }

            //guardar el cliente
            cliente=await Cliente.findByIdAndUpdate({_id:id},input,{new:true});
            return cliente;
        },
        eliminarCliente:async(_,{id},ctx)=>{
            let cliente=await Cliente.findById(id);

            if (!cliente){
                throw new Error('Ese cliente no existe');
            }

            //Verificar si el vendedor es quien edita
            if (cliente.vendedor.toString()!==ctx.usuario.id){
                throw new Error ('no tienes las credenciales');
            }

            //Eliminar
            await Cliente.findOneAndDelete({_id:id});
            return "cliente elminado";
        },
        nuevoPedido: async(_,{input},ctx)=>{
            const {cliente}=input

            //verificar si el cliente existe o no
            let clienteExiste=await Cliente.findById(cliente);

            if(!clienteExiste){
                throw new Error ('Ese cliente no existe')
            }
            //verificar si el cliente es del vendedor

            if (clienteExiste.vendedor.toString()!==ctx.usuario.id){
                throw new Error ('No tienes las credenciales');
            }

            //revisar que el stock este disponible
            for await(const articulo of input.pedido){
                const {id}=articulo;
                const producto=await Producto.findById(id);
                if (articulo.cantidad>producto.existencia){
                    throw new Error (`El articulo: ${producto.nombre} excede la cantidad disponible`);
                }else{
                    producto.existencia=producto.existencia - articulo.cantidad;
                    await producto.save();
                }
            }
            // Crear nuevo pedido
            const nuevoPedido=new Pedido(input);

            //console.log ('despues del error...');
            //asignarle un vendedor
            nuevoPedido.vendedor=ctx.usuario.id;
            //Guardarlo en la base de datos
            const resultado=await nuevoPedido.save();
            return resultado;
        },
        actualizarPedido:async(_,{id,input},ctx)=>{
            const {cliente}=input;
            //Si el pedido Existe
            const existePedido =await Pedido.findById(id);
            
            if(!existePedido){
                throw new Error ('Ese pedido no existe');
            }
            //Si el Cliente existe
            const existecliente =await Cliente.findById(cliente);
            
            if(!existecliente){
                throw new Error ('Ese Cliente no existe');
            }

            //Si el cliente y pedido pertenece al vendedor
            if (existecliente.vendedor.toString()!==ctx.usuario.id){
                throw new Error ('No tienes las credenciales');
            }
            //Revisar el Stock
            if (input.pedido){
                for await(const articulo of input.pedido){
                    const {id}=articulo;
                    const producto=await Producto.findById(id);
                    if (articulo.cantidad>producto.existencia){
                        throw new Error (`El articulo: ${producto.nombre} excede la cantidad disponible`);
                    }else{
                        producto.existencia=producto.existencia - articulo.cantidad;
                        await producto.save();
                    }
                }
            }
            //Guardar el pedido


            const resultado=await Pedido.findOneAndUpdate({_id:id},input,{new:true});
            return resultado;
        },
        eliminarPedido:async(_,{id},ctx)=>{
            const pedido=await Pedido.findById(id);
            //si existe el pedido
            if (!pedido){
                throw new Error('Ese Pedido no existe');
            }

            //Verificar si el vendedor es quien edita
            if (pedido.vendedor.toString()!==ctx.usuario.id){
                throw new Error ('no tienes las credenciales');
            }

            //Eliminar
            await Pedido.findOneAndDelete({_id:id});
            return "Pedido elminado";
        },
    }
}

module.exports=resolvers;