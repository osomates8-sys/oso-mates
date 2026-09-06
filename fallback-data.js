/* Oso Mates - datos estáticos de respaldo.
   Se usan solo si la base de datos remota no responde, para que la tienda
   siga funcionando igual. Cuando la base vuelve, el sitio usa los datos en vivo.
   Snapshot: 2026-09-06 */
(function () {
  window.FALLBACK_PRODUCTOS = [
    {
      id: "989dbb05-c433-453a-9b29-90302b15ee42",
      nombre: "Imperial",
      material: "Vegetal · Calabaza",
      descripcion: "La tradición en su forma más pura. Un sabor único en cada cebada.",
      precio: 56000,
      precio_transferencia: 50400,
      link_mp: "https://mpago.la/1CXzmCj",
      imagen: "IMG_5190-Edit.jpg",
      categoria: "calabaza",
      badge: null,
      activo: true,
      created_at: "2026-05-27T22:16:01.096033",
      imagenes: ["IMG_5206-Edit.jpg", "IMG_5190-Edit.jpg"]
    },
    {
      id: "6fcc197e-6d1a-4cb0-8763-c57509cd6c8f",
      nombre: "Criollo",
      material: "Artesanal",
      descripcion: "Fiel a sus raíces. El mate de toda la vida hecho con el cuidado de siempre.",
      precio: 33000,
      precio_transferencia: 29700,
      link_mp: "https://mpago.la/32z2CKR",
      imagen: "IMG_5161-Edit.jpg",
      categoria: "calabaza",
      badge: null,
      activo: true,
      created_at: "2026-05-27T22:16:01.096033",
      imagenes: ["IMG_5161-Edit.jpg", "IMG_5218-Edit-2-Edit.jpg"]
    },
    {
      id: "0992d3e8-e059-4d23-81fc-0237c4ee5a23",
      nombre: "Imperial Algarrobo",
      material: "Madera · Algarrobo",
      descripcion: "Porte elegante y tamaño generoso. El preferido de los entendidos.",
      precio: 55000,
      precio_transferencia: 49500,
      link_mp: "https://mpago.la/2vLXAT1",
      imagen: "IMG_5145.jpg",
      categoria: "madera",
      badge: "Popular",
      activo: true,
      created_at: "2026-05-27T22:16:01.096033",
      imagenes: ["DSC08987.jpg", "IMG_5139.jpg", "IMG_5145.jpg"]
    },
    {
      id: "742a8678-34c3-420c-bf0e-00fddf5e330e",
      nombre: "Camionero",
      material: "Madera · Algarrobo",
      descripcion: "El clásico resistente. Forma robusta y cómoda, ideal para el día a día.",
      precio: 34000,
      precio_transferencia: 30600,
      link_mp: "https://mpago.li/1jQtnMd",
      imagen: "camionero2.webp",
      categoria: "madera",
      badge: null,
      activo: true,
      created_at: "2026-05-27T22:16:01.096033",
      imagenes: ["camionero2.webp"]
    },
    {
      id: "6d4bd8d7-b783-4294-81a0-f6e3b323b55d",
      nombre: "Ranchero",
      material: "Artesanal · Premium",
      descripcion: "Para los que van en serio. Grande, noble y con mucha personalidad.",
      precio: 62000,
      precio_transferencia: 55800,
      link_mp: "https://mpago.la/2LW1Ssz",
      imagen: "ranchero2.webp",
      categoria: "madera",
      badge: "Exclusivo",
      activo: true,
      created_at: "2026-05-27T22:16:01.096033",
      imagenes: ["ranchero2.webp"]
    },
    {
      id: "0c98363c-7285-4b7f-bb83-350d8f88d5e8",
      nombre: "Galleta",
      material: "Artesanal",
      descripcion: "Forma redondeada y clásica, perfecta para cebar.",
      precio: 35000,
      precio_transferencia: 31500,
      link_mp: "https://mpago.la/1zuCJtU",
      imagen: "galleta2.webp",
      categoria: "calabaza",
      badge: null,
      activo: true,
      created_at: "2026-05-27T22:16:01.096033",
      imagenes: ["galleta2.webp"]
    }
  ];

  window.FALLBACK_CONFIG = {
    galeria_imgs: '["IMG_5233.jpg","IMG_5277.jpg","IMG_5272.jpg"]',
    faq_items: '[{"q":"¿Cuánto tarda en llegar el pedido?","a":"Despachamos en 48 horas hábiles desde que confirmamos el pago. El tiempo de entrega depende de tu ubicación: CABA y GBA 2-3 días, interior del país 3-7 días hábiles. Te enviamos el número de seguimiento por email."},{"q":"¿Los mates vienen curados?","a":"Los mates se entregan sin curar. Pero no te preocupes: junto a cada mate enviamos una guía práctica con el paso a paso para que puedas curarlo fácilmente y empezar a disfrutarlo."},{"q":"¿Cómo funciona el descuento por transferencia?","a":"Al elegir el método de pago \\"Transferencia\\" en el checkout, el 10% de descuento se aplica automáticamente. Los datos bancarios (CBU del Banco Francés) aparecen en pantalla y te los enviamos por email."},{"q":"¿Puedo pedir un mate personalizado?","a":"¡Sí! Hacemos grabados personalizados con nombres, fechas o diseños. Escribinos por WhatsApp para consultar opciones y presupuesto. El tiempo de producción es de 1 a 3 días hábiles."},{"q":"¿Tienen local físico?","a":"Somos un emprendimiento online con taller en Mar del Plata. Por el momento no tenemos local físico, pero podés coordinar retiro en mano si estás en MDP escribiéndonos por WhatsApp."}]',
    hero_h1: "Hechos",
    hero_h2: "para acompañarte",
    hero_desc: "",
    banner: "Envio gratis en compras mayores a $100.000 | 10% OFF pagando por transferencia",
    nosotros_content: '{"title1":"Hechos a mano","title2":"para cada encuentro","body":"Cada mate es trabajado artesanalmente, respetando la forma y la esencia de la madera. Seleccionamos cada pieza con dedicación para ofrecer productos únicos, pensados para acompañar tus momentos más importantes.","values":[{"icon":"🌲","name":"Piezas únicas","desc":"La veta, el color y la forma hacen que cada mate sea irrepetible."},{"icon":"✋","name":"A mano","desc":"Elaborados con dedicación y oficio, manteniendo viva una tradición."},{"icon":"📦","name":"Envíos a todo el país","desc":"Llevamos Oso Mates a cada rincón de Argentina."},{"icon":"💬","name":"Atención real","desc":"Respondemos el mismo día"}]}',
    testimonios: '[{"stars":5,"text":"Compré el Imperial Algarrobo y es una joya. La madera tiene una textura increíble, se nota que es tallado a mano. Llegó en perfectas condiciones.","author":"Martina G.","location":"Buenos Aires"},{"stars":5,"text":"Pedí uno para regalar y quedaron fascinados. La calidad es impresionante para el precio. La bombilla artesanal también es hermosa. 100% lo recomiendo.","author":"Federico R.","location":"Rosario"},{"stars":5,"text":"Un lujo la atención y los productos, los mejores de Mar del plata!!","author":"Agustin F.","location":"Mar del plata"}]',
    coupon: '{"code":"OSO10","percent":10,"active":true}'
  };

  window.FALLBACK_CONFIG_ROWS = Object.keys(window.FALLBACK_CONFIG).map(function (k) {
    return { clave: k, valor: window.FALLBACK_CONFIG[k] };
  });
})();
