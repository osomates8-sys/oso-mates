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

// Escena 1: foto a pantalla completa con zoom lento y "Tallados a mano."
const HookSceneInner: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <>
      <Img
        name="Foto mate con yerba"
        src={staticFile("IMG_5277.webp")}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "60% 50%",
          scale: interpolate(frame, [0, 2.6 * fps], [1, 1.1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            output: "perceptual-scale",
          }),
        }}
      />
      <Interactive.Div
        name="Sombra"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(21,21,26,0.55) 0%, rgba(21,21,26,0) 28%, rgba(21,21,26,0) 48%, rgba(21,21,26,0.88) 100%)",
        }}
      />
      <Interactive.Div
        name="Kicker"
        style={{
          position: "absolute",
          left: 96,
          top: 140,
          fontFamily: sans,
          fontWeight: 500,
          fontSize: 28,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: "#f8f8f6",
          opacity: interpolate(frame, [0.2 * fps, 1.1 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.215, 0.61, 0.355, 1),
          }),
          translate: interpolate(frame, [0.2 * fps, 1.1 * fps], ["60px 0px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.215, 0.61, 0.355, 1),
          }),
        }}
      >
        Oso Mates · Mar del Plata
      </Interactive.Div>
      <Interactive.Div
        name="Línea kicker"
        style={{
          position: "absolute",
          left: 96,
          top: 196,
          width: 180,
          height: 3,
          backgroundColor: "#c8956c",
          transformOrigin: "left center",
          scale: interpolate(frame, [0.45 * fps, 1.15 * fps], ["0 1", "1 1"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 96,
          right: 96,
          bottom: 220,
          fontFamily: serif,
          fontStyle: "italic",
          fontWeight: 500,
          lineHeight: 0.92,
        }}
      >
        <div style={{ overflow: "hidden", paddingBottom: 12 }}>
          <Interactive.Div
            name="Tallados"
            style={{
              fontSize: 210,
              color: "#f8f8f6",
              translate: interpolate(frame, [0.35 * fps, 1.1 * fps], ["0px 110%", "0px 0%"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              }),
            }}
          >
            Tallados
          </Interactive.Div>
        </div>
        <div style={{ overflow: "hidden", paddingBottom: 12 }}>
          <Interactive.Div
            name="a mano"
            style={{
              fontSize: 170,
              color: "#c8956c",
              transformOrigin: "left bottom",
              translate: interpolate(frame, [0.62 * fps, 1.52 * fps], ["0px 110%", "0px 0%"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.165, 0.84, 0.44, 1),
              }),
              rotate: interpolate(frame, [0.62 * fps, 1.52 * fps], ["3deg", "0deg"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.165, 0.84, 0.44, 1),
              }),
            }}
          >
            a mano.
          </Interactive.Div>
        </div>
      </div>
    </>
  );
};

const hookSchema = {} as const satisfies InteractivitySchema;

export const HookScene = Interactive.withSchema({
  Component: HookSceneInner,
  componentName: "HookScene",
  schema: hookSchema,
  wrapInSequence: true,
  layout: "absolute-fill",
});
