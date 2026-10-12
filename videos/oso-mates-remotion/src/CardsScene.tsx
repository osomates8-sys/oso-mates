import type React from "react";
import {
  Easing,
  Img,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { sans, serif } from "./fonts";

// Escena 2: fondo crema, "Cada uno, único." y tres fotos que caen como tarjetas
const CardsSceneInner: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <>
      <Interactive.Div name="Fondo crema" style={{ position: "absolute", inset: 0, backgroundColor: "#f2f0eb" }} />
      <Interactive.Div
        name="Brillo cálido"
        style={{
          position: "absolute",
          left: -300,
          top: 760,
          width: 1500,
          height: 1300,
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(200,149,108,0.32), rgba(200,149,108,0))",
          translate: interpolate(frame, [0, 3.15 * fps], ["0px 0px", "260px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
      <Interactive.Div
        name="Etiqueta"
        style={{
          position: "absolute",
          left: 96,
          top: 150,
          fontFamily: sans,
          fontWeight: 500,
          fontSize: 26,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: "#946437",
          opacity: interpolate(frame, [0.05 * fps, 0.45 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          }),
          translate: interpolate(frame, [0.05 * fps, 0.45 * fps], ["-40px 0px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          }),
        }}
      >
        Piezas artesanales
      </Interactive.Div>
      <Interactive.Div
        name="Título"
        style={{
          position: "absolute",
          left: 96,
          top: 200,
          fontFamily: serif,
          fontWeight: 500,
          fontSize: 150,
          lineHeight: 0.95,
          color: "#15151a",
          clipPath: `inset(0% ${interpolate(frame, [0.12 * fps, 0.72 * fps], [100, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.075, 0.82, 0.165, 1),
          })}% 0% 0%)`,
        }}
      >
        Cada uno,
        <br />
        <em style={{ color: "#946437" }}>único.</em>
      </Interactive.Div>
      <Interactive.Div
        name="Tarjeta 1"
        style={{
          position: "absolute",
          left: 190,
          top: 740,
          width: 700,
          height: 960,
          padding: "20px 20px 80px",
          backgroundColor: "#f8f8f6",
          boxShadow: "0 40px 80px rgba(21,21,26,0.22), 0 6px 18px rgba(21,21,26,0.12)",
          opacity: interpolate(frame, [0.3 * fps, 0.4 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [0.3 * fps, 0.85 * fps], ["-900px 0px", "-40px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.34, 1.56, 0.64, 1),
          }),
          rotate: interpolate(frame, [0.3 * fps, 0.85 * fps], ["-22deg", "-7deg"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.34, 1.56, 0.64, 1),
          }),
        }}
      >
        <Img name="Foto tarjeta 1" src={staticFile("IMG_5139.webp")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </Interactive.Div>
      <Interactive.Div
        name="Tarjeta 2"
        style={{
          position: "absolute",
          left: 190,
          top: 740,
          width: 700,
          height: 960,
          padding: "20px 20px 80px",
          backgroundColor: "#f8f8f6",
          boxShadow: "0 40px 80px rgba(21,21,26,0.22), 0 6px 18px rgba(21,21,26,0.12)",
          opacity: interpolate(frame, [0.85 * fps, 0.95 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [0.85 * fps, 1.35 * fps], ["900px 0px", "50px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          rotate: interpolate(frame, [0.85 * fps, 1.35 * fps], ["20deg", "5deg"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <Img name="Foto tarjeta 2" src={staticFile("IMG_5190-Edit.webp")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </Interactive.Div>
      <Interactive.Div
        name="Tarjeta 3"
        style={{
          position: "absolute",
          left: 190,
          top: 740,
          width: 700,
          height: 960,
          padding: "20px 20px 80px",
          backgroundColor: "#f8f8f6",
          boxShadow: "0 40px 80px rgba(21,21,26,0.22), 0 6px 18px rgba(21,21,26,0.12)",
          opacity: interpolate(frame, [1.4 * fps, 1.5 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [1.4 * fps, 2.05 * fps], ["0px 1000px", "0px 30px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.165, 0.84, 0.44, 1),
          }),
          rotate: interpolate(frame, [1.4 * fps, 2.05 * fps], ["8deg", "-1.5deg"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.165, 0.84, 0.44, 1),
          }),
        }}
      >
        <Img name="Foto tarjeta 3" src={staticFile("IMG_5233.webp")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </Interactive.Div>
    </>
  );
};

const cardsSchema = {} as const satisfies InteractivitySchema;

export const CardsScene = Interactive.withSchema({
  Component: CardsSceneInner,
  componentName: "CardsScene",
  schema: cardsSchema,
  wrapInSequence: true,
  layout: "absolute-fill",
});
