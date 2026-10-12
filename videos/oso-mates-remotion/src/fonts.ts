import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Fuentes del sitio Oso Mates, guardadas en public/fonts (variables: un archivo cubre todos los pesos)
export const serif = "Cormorant Garamond";
export const sans = "Montserrat";

loadFont({
  family: serif,
  url: staticFile("fonts/CormorantGaramond-Italic.woff2"),
  style: "italic",
  weight: "300 700",
});
loadFont({
  family: serif,
  url: staticFile("fonts/CormorantGaramond.woff2"),
  style: "normal",
  weight: "300 700",
});
loadFont({
  family: sans,
  url: staticFile("fonts/Montserrat.woff2"),
  weight: "100 900",
});
