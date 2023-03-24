const mongoose=require('mongoose');

const ProductosSchema=mongoose.Schema({
    pedido:{
        type:Array,
        require:true
    },
    total:{
        type: Number,
        required:true
    },
    cliente:{
        type:mongoose.Schema.Types.ObjectId,
        required: true,
        ref:'Cliente'
    },
    vendedor:{
        type:mongoose.Schema.Types.ObjectId,
        required: true,
        ref:'Usuario'
    },
    estado:{
        type:String,
        default:"PENDIENTE"
    },
    creado:{
        type:Date,
        default:Date.now()
    }
});

module.exports=mongoose.model('Pedido',ProductosSchema);