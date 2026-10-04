/* Oso Mates - datos de la tienda. Editado desde editar.html el 2026-10-01.
   La tienda usa SOLO estos datos (no hay base de datos externa). */
(function () {
  window.FALLBACK_PRODUCTOS = [
    {
      "id": "989dbb05-c433-453a-9b29-90302b15ee42",
      "nombre": "Imperial",
      "material": "Vegetal · Calabaza",
      "descripcion": "La tradición en su forma más pura. Un sabor único en cada cebada.",
      "precio": 56000,
      "precio_transferencia": 50400,
      "imagen": "IMG_5206-Edit.jpg|54% 45%",
      "categoria": "calabaza",
      "badge": null,
      "activo": true,
      "created_at": "2026-05-27T22:16:01.096033",
      "imagenes": [
        "IMG_5206-Edit.jpg|54% 45%",
        "IMG_5190-Edit.jpg"
      ],
      "stock": null
    },
    {
      "id": "6fcc197e-6d1a-4cb0-8763-c57509cd6c8f",
      "nombre": "Criollo",
      "material": "Artesanal",
      "descripcion": "Fiel a sus raíces. El mate de toda la vida hecho con el cuidado de siempre.",
      "precio": 33000,
      "precio_transferencia": 29700,
      "imagen": "IMG_5161-Edit.jpg|52% 57%",
      "categoria": "calabaza",
      "badge": null,
      "activo": true,
      "created_at": "2026-05-27T22:16:01.096033",
      "imagenes": [
        "IMG_5161-Edit.jpg|52% 57%",
        "IMG_5218-Edit-2-Edit.jpg|52% 64%"
      ],
      "stock": null
    },
    {
      "id": "0992d3e8-e059-4d23-81fc-0237c4ee5a23",
      "nombre": "Imperial Algarrobo",
      "material": "Madera · Algarrobo",
      "descripcion": "Porte elegante y tamaño generoso. El preferido de los entendidos.",
      "precio": 55000,
      "precio_transferencia": 49500,
      "imagen": "IMG_5139.jpg|48% 61%",
      "categoria": "madera",
      "badge": "Popular",
      "activo": true,
      "created_at": "2026-05-27T22:16:01.096033",
      "imagenes": [
        "IMG_5139.jpg|48% 61%",
        "IMG_5145.jpg|52% 55%",
        "imperial-algarrobo-muftpl9nujl.webp|52% 61%",
        "imperial-algarrobo-mugygxq5cvh.webp"
      ],
      "stock": null
    },
    {
      "id": "742a8678-34c3-420c-bf0e-00fddf5e330e",
      "nombre": "Camionero",
      "material": "Madera · Algarrobo",
      "descripcion": "El clásico resistente. Forma robusta y cómoda, ideal para el día a día.",
      "precio": 34000,
      "precio_transferencia": 30600,
      "imagen": "camionero-muftpmhoz9y.webp|47% 55%",
      "categoria": "madera",
      "badge": null,
      "activo": true,
      "created_at": "2026-05-27T22:16:01.096033",
      "imagenes": [
        "camionero-muftpmhoz9y.webp|47% 55%",
        "camionero-muftpnooci1.webp|43% 54%"
      ],
      "stock": null
    },
    {
      "id": "6d4bd8d7-b783-4294-81a0-f6e3b323b55d",
      "nombre": "Ranchero",
      "material": "Artesanal · Premium",
      "descripcion": "Para los que van en serio. Grande, noble y con mucha personalidad.",
      "precio": 62000,
      "precio_transferencia": 55800,
      "imagen": "ranchero-muftpoq5piw.webp|48% 73%",
      "categoria": "madera",
      "badge": "Exclusivo",
      "activo": true,
      "created_at": "2026-05-27T22:16:01.096033",
      "imagenes": [
        "ranchero-muftpoq5piw.webp|48% 73%",
        "ranchero-muftppvyy4c.webp|53% 68%",
        "ranchero-muftpqulkny.webp|47% 59%"
      ],
      "stock": null
    },
    {
      "id": "0c98363c-7285-4b7f-bb83-350d8f88d5e8",
      "nombre": "Galleta",
      "material": "Artesanal",
      "descripcion": "Forma redondeada y clásica, perfecta para cebar.",
      "precio": 35000,
      "precio_transferencia": 31500,
      "imagen": "galleta-muftpryxvqj.webp|51% 61%",
      "categoria": "calabaza",
      "badge": null,
      "activo": true,
      "created_at": "2026-05-27T22:16:01.096033",
      "imagenes": [
        "galleta-muftpryxvqj.webp|51% 61%",
        "galleta-muftpszpxpk.webp|60% 28%"
      ],
      "stock": null
    }
  ];

  window.FALLBACK_CONFIG = {
    "pago_tarjeta": "{\"active\":true,\"cuotas\":3,\"proveedor\":\"Naranja X\"}",
    "galeria_imgs": "[\"IMG_5233.jpg\",\"IMG_5277.jpg\",\"IMG_5272.jpg\"]",
    "faq_items": "[{\"q\":\"¿Cuánto tarda en llegar el pedido?\",\"a\":\"Despachamos en 48 horas hábiles desde que confirmamos el pago. El tiempo de entrega depende de tu ubicación: CABA y GBA 2-3 días, interior del país 3-7 días hábiles. Te enviamos el número de seguimiento por email.\"},{\"q\":\"¿Los mates vienen curados?\",\"a\":\"Los mates se entregan sin curar. Pero no te preocupes: junto a cada mate enviamos una guía práctica con el paso a paso para que puedas curarlo fácilmente y empezar a disfrutarlo.\"},{\"q\":\"¿Cómo funciona el descuento por transferencia?\",\"a\":\"Al elegir el método de pago \\\"Transferencia\\\" en el checkout, el 10% de descuento se aplica automáticamente. Los datos bancarios (CBU del Banco Francés) aparecen en pantalla y te los enviamos por email.\"},{\"q\":\"¿Puedo pedir un mate personalizado?\",\"a\":\"¡Sí! Podés agregar grabado personalizado (nombres, fechas o diseños) marcando la casilla en la página de cada mate; el precio se suma solo. Después de confirmar el pago coordinamos el diseño por WhatsApp. El grabado demora 2 a 3 días hábiles; en Mar del Plata te lo llevamos al terminarlo y al resto del país se despacha y se suma el tiempo de envío.\"},{\"q\":\"¿Tienen local físico?\",\"a\":\"Somos un emprendimiento online de Mar del Plata. Por el momento no tenemos local físico, pero podés coordinar retiro en mano si estás en MDP escribiéndonos por WhatsApp.\"}]",
    "hero_h1": "Hechos",
    "hero_h2": "para acompañarte",
    "hero_desc": "",
    "banner": "Envio gratis en compras mayores a $100.000 | 10% OFF pagando por transferencia",
    "nosotros_content": "{\"title1\":\"Hechos a mano\",\"title2\":\"para cada encuentro\",\"body\":\"Cada mate es trabajado artesanalmente, respetando la forma y la esencia de la madera. Seleccionamos cada pieza con dedicación para ofrecer productos únicos, pensados para acompañar tus momentos más importantes.\",\"values\":[{\"icon\":\"🌲\",\"name\":\"Piezas únicas\",\"desc\":\"La veta, el color y la forma hacen que cada mate sea irrepetible.\"},{\"icon\":\"✋\",\"name\":\"A mano\",\"desc\":\"Elaborados con dedicación y oficio, manteniendo viva una tradición.\"},{\"icon\":\"📦\",\"name\":\"Envíos a todo el país\",\"desc\":\"Llevamos Oso Mates a cada rincón de Argentina.\"},{\"icon\":\"💬\",\"name\":\"Atención real\",\"desc\":\"Respondemos el mismo día\"}]}",
    "testimonios": "[{\"stars\":5,\"text\":\"Compré el Imperial Algarrobo y es una joya. La madera tiene una textura increíble, se nota que es tallado a mano. Llegó en perfectas condiciones.\",\"author\":\"Martina G.\",\"location\":\"Buenos Aires\"},{\"stars\":5,\"text\":\"Pedí uno para regalar y quedaron fascinados. La calidad es impresionante para el precio. La bombilla artesanal también es hermosa. 100% lo recomiendo.\",\"author\":\"Federico R.\",\"location\":\"Rosario\"},{\"stars\":5,\"text\":\"Un lujo la atención y los productos, los mejores de Mar del plata!!\",\"author\":\"Agustin F.\",\"location\":\"Mar del plata\"}]",
    "coupon": "{\"code\":\"OSO10\",\"percent\":10,\"active\":true}",
    "coupon_newsletter": "{\"code\":\"BIENVENIDA5\",\"percent\":5,\"active\":true}",
    "ga_id": "G-74Q6C5ZQMS",
    "campana_madre": "{\"active\":true,\"titulo\":\"Día de la Madre\",\"fecha\":\"2026-10-18\",\"sorteo_premio\":\"un mate Ranchero + bombilla pico de loro + yerba LIBRE\",\"sorteo_hasta\":\"2026-10-16\",\"sorteo_dia\":\"2026-10-17\",\"sorteo_link\":\"\"}",
    "oso_config": "{\"activo\":true,\"lado\":\"der\",\"tamano\":\"mediano\",\"celular\":true,\"zonas\":{\"inicio\":{\"accion\":\"saluda\",\"frase\":\"¡Hola! Encontrá tu próximo mate\"},\"productos\":{\"accion\":\"mate\",\"frase\":\"Un mate y seguimos!\"},\"galeria\":{\"accion\":\"mira\",\"frase\":\"Elegi el tuyo\"},\"info\":{\"accion\":\"quieto\",\"frase\":\"Este es para vos\"},\"contacto\":{\"accion\":\"asiente\",\"frase\":\"¿Te cebo uno? Escribinos.\"}},\"tocar\":[\"¡Cebame uno!\",\"Desde Mar del Plata a todo el país.\",\"¿Ya viste los bombillones?\",\"El ranchero es mi favorito.\"]}",
    "grabado": "{\"active\":true,\"price\":9000,\"maxChars\":20}"
  };

  window.FALLBACK_CONFIG_ROWS = Object.keys(window.FALLBACK_CONFIG).map(function (k) {
    return { clave: k, valor: window.FALLBACK_CONFIG[k] };
  });
})();
