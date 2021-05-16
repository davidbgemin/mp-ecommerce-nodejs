var express = require('express');
var exphbs  = require('express-handlebars');
var mercadopago = require('mercadopago');
var { json } = require('body-parser')
require("dotenv").config();
var port = process.env.PORT || 3000
// una vez que instalamos e importamos la libreria ahora es necesario definir las credenciales para que mp sepa quienes somo (algo así como cuando usamos firebase)
mercadopago.configure({
    // el access_token es la token que nos generará mp por cada integración que realicemos, esta token es única por empresa y no debe ser usada en dos pasarelas diferentes ya que la configuración será diferente
    access_token: process.env.ACCESS_TOKEN,
    // integrator_id es la identificación que nosotros tendremos una vez realizada la certificación, esta nos ayudará para que mp sepa que desarrollador fue el responsable de dicha integración
    integrator_id: process.env.INTEGRATOR_ID
})

var app = express();
app.use(json())
app.use((req,res,next)=>{
    res.header('Access-Control-Allow-Origin','*');
    res.header('Access-Control-Allow-Headers','Authorization, Content-Type, Access-Content-Type, Accept');
    res.header('Access-Control-Allow-Methods','GET, POST, PUT, DELETE');
    next();
  });

const cliente = {
    name: "Lalo",
    surname: "Landa",
    email: "test_user_46542185@testuser.com",
    phone: {
        number: 5549737300,
        area_code: "52"
    },
    address: {
        zip_code: "03940",
        street_name: "Insurgentes Sur",
        street_number: 1602
    },
    identification: {
        type: "DNI", /* https://api.mercadopago.com/v1/identification_types */
        number: "22334445"
    }
};

const metodos_pago = {
    installments: 6,
    exclude_payment_methods: [
        {
            id: "dinners"
        }
    ],
    exclude_payment_types: [
        {
            id: "atm",
        }
    ]
}

const preferencia = {
    items: [],
    back_urls: {
        success: "",
        pending: "",
        failure: ""
    },
    payment_methods: metodos_pago,
    payer: cliente,
    auto_return: "approved",
    notification_url: "",
    // un endpoint en el cual mercado pago nos mandara la actualizacion de nuestro pago mediante un metodo POST y nosotros le tenemos que responder un estado 200 o 201 para que no haga spam a ese endpoint, OJO: no poner la notification_url en modo localhost ya que mp no creara la preferenca por declara una url invalida (127.0.0.1 | localhost)
    external_reference: "davidbgemin@gmail.com"
}
 
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

app.use(express.static('assets'));
 
app.use('/assets', express.static(__dirname + '/assets'));

app.get('/', function (req, res) {
    res.render('home');
});

app.get('/detail', async function (req, res) {
    // console.log(req.query);
    // crear el objeto item y agregarlo al array de items de la preferencia (leer la documentación para ello):
    // { img: './assets/l6g6.jpg', title: 'LG G6', price: '10000', unit: '1' }
    const item = {
        id: "1234",
        title: req.query.title,
        description: "Dispositivo móvil de Tienda e-comemrce",
        picture_url: req.query.img,
        // category_id: "", /* category_id no es obligatorio, en este caso no se pone porque el producto no tiene categoría */
        quantity: +req.query.unit,
        currency_id: "PEN", /* currency_id es obligatorio */
        unit_price: +req.query.price,
    };

    preferencia.items.push(item);
    // ahora modificamos las back_url para indicar el dominio de nuestra aplicación
    preferencia.back_urls.failure = `${req.get('host')}/failure`; /* http:/127.0.0.1:5000 */
    preferencia.back_urls.success = `${req.get('host')}/success`;
    preferencia.back_urls.pending = `${req.get('host')}/pending`;
    preferencia.notification_url = `${req.get('host')}/notificaciones`; /* esta propiedad se define antes de ya subir a producción */
    // notification_url solo se puede usar en ambies de producción (no localhost ni 127.0.0.1) porque es a es endpoint en el cual se mandará el estado de la pasarela de pago y por endeal identificar uno de los dominios anterior lanzará un error y no se procederá con la pasarela
    // preferencia.notification_url = `${req.get('host')}/notificaciones`
    const respuesta = await mercadopago.preferences.create(preferencia);
    console.log(respuesta);
    req.query.init_point = respuesta.body.init_point;
    req.query.id = respuesta.body.id;
    res.render('detail', req.query);
});


app.get("/success", function(req,res) {
    console.log(req.query);
    res.render("success", req.query);
})

app.get("/failure", function(req,res) {
    console.log(req.query);
    res.render("failure", req.query);
})

app.get("/pending", function(req,res) {
    console.log(req.query);
    res.render("pending", req.query);
})

app.post("/notificaciones", function (req, res) {
    console.log("INICIO DE NOTIFICACIONES");
    console.log("MEDIANTE EL QUERY PARAMS");
    console.log(req.query);
    console.log("MEDIANTE EL BODY");
    console.log(req.body);
    res.status(200);
});

app.listen(port);