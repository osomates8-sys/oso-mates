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

// Escena 3: panel oscuro que sube, foto en arco, OSO MATES letra por letra
const CloseSceneInner: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const letters = ["O", "S", "O", " ", "M", "A", "T", "E", "S"];

  return (
    <>
      <Interactive.Div
        name="Panel oscuro"
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(120% 70% at 50% 30%, #23222a 0%, #15151a 70%)",
          clipPath: `inset(${interpolate(frame, [0, 0.55 * fps], [100, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.87, 0, 0.13, 1),
          })}% 0% 0% 0%)`,
        }}
      />
      <Interactive.Div
        name="Arco"
        style={{
          position: "absolute",
          left: 220,
          top: 330,
          width: 640,
          height: 860,
          borderRadius: "320px 320px 24px 24px",
          overflow: "hidden",
          boxShadow: "0 0 0 2px rgba(200,149,108,0.55)",
          clipPath: `inset(${interpolate(frame, [0.35 * fps, 1.15 * fps], [100, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.075, 0.82, 0.165, 1),
          })}% 0% 0% 0% round 320px 320px 24px 24px)`,
        }}
      >
        <Img
          name="Foto arco"
          src={staticFile("IMG_5272.webp")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "55% 60%",
            scale: interpolate(frame, [0.35 * fps, 2.75 * fps], [1.18, 1.02], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.61, 1, 0.88, 1),
              output: "perceptual-scale",
            }),
          }}
        />
      </Interactive.Div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 1290,
          display: "flex",
          justifyContent: "center",
          fontFamily: sans,
          fontWeight: 600,
          fontSize: 92,
          letterSpacing: "0.2em",
          paddingLeft: "0.2em",
          color: "#f8f8f6",
          whiteSpace: "nowrap",
        }}
      >
        {letters.map((ch, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: interpolate(frame - i * 0.045 * fps, [0.75 * fps, 1.2 * fps], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.215, 0.61, 0.355, 1),
              }),
              translate: interpolate(frame - i * 0.045 * fps, [0.75 * fps, 1.2 * fps], ["0px 60px", "0px 0px"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.215, 0.61, 0.355, 1),
              }),
            }}
          >
            {ch}
          </span>
        ))}
      </div>
      <Interactive.Div
        name="Línea"
        style={{
          position: "absolute",
          left: 360,
          top: 1440,
          width: 360,
          height: 3,
          backgroundColor: "#c8956c",
          scale: interpolate(frame, [1.2 * fps, 1.8 * fps], ["0 1", "1 1"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.45, 0, 0.55, 1),
          }),
        }}
      />
      <Interactive.Div
        name="Tagline"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 1470,
          textAlign: "center",
          fontFamily: serif,
          fontStyle: "italic",
          fontSize: 50,
          color: "#c8956c",
          opacity: interpolate(frame, [1.45 * fps, 2.15 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.61, 1, 0.88, 1),
          }),
          translate: interpolate(frame, [1.45 * fps, 2.15 * fps], ["0px 16px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.61, 1, 0.88, 1),
          }),
        }}
      >
        Mates artesanales
      </Interactive.Div>
    </>
  );
};

const closeSchema = {} as const satisfies InteractivitySchema;

export const CloseScene = Interactive.withSchema({
  Component: CloseSceneInner,
  componentName: "CloseScene",
  schema: closeSchema,
  wrapInSequence: true,
  layout: "absolute-fill",
});
