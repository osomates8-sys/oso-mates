import type React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { sans, serif } from "./fonts";

// Plantilla: un mate en la cocina. Si hay `recorte`, el mate recortado se apoya
// sobre la mesada de `fondo`; si no, `fondo` ya es una foto del mate en la cocina.
export type MateVideoProps = {
  readonly nombre: string;
  readonly material: string;
  readonly descripcion: string;
  readonly fondo: string;
  readonly recorte: string;
  readonly encuadre: string;
};

export const MateVideo: React.FC<MateVideoProps> = ({
  nombre,
  material,
  descripcion,
  fondo,
  recorte,
  encuadre,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#15151a" }}>
      <Img
        name="Cocina"
        src={staticFile(fondo)}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: encuadre,
          scale: interpolate(frame, [0, 7 * fps], [1.12, 1.0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.33, 0, 0.2, 1),
            output: "perceptual-scale",
          }),
        }}
      />
      {recorte ? (
        <>
          {/* Luz cálida de ventana, para que el fondo combine con las fotos al sol */}
          <Interactive.Div
            name="Luz de ventana"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(115deg, rgba(255,196,128,0.28) 0%, rgba(255,196,128,0.08) 45%, rgba(40,24,10,0.18) 100%)",
            }}
          />
          <Interactive.Div
            name="Sombra del mate"
            style={{
              position: "absolute",
              left: 290,
              top: 1460,
              width: 560,
              height: 90,
              borderRadius: "50%",
              background:
                "radial-gradient(closest-side, rgba(40,26,14,0.55), rgba(40,26,14,0))",
              opacity: interpolate(frame, [0.3 * fps, 1.1 * fps], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          />
          <Img
            name="Mate"
            src={staticFile(recorte)}
            style={{
              position: "absolute",
              left: 190,
              top: 790,
              width: 700,
              height: 720,
              objectFit: "contain",
              objectPosition: "50% 100%",
              filter:
                "sepia(0.18) saturate(1.08) brightness(0.96) contrast(1.04)",
              opacity: interpolate(frame, [0.3 * fps, 0.9 * fps], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              translate: interpolate(
                frame,
                [0.3 * fps, 1.3 * fps],
                ["0px -70px", "0px 0px"],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.22, 1, 0.36, 1),
                },
              ),
            }}
          />
        </>
      ) : null}

      {/* Velos para que el texto se lea sobre los azulejos y la mesada */}
      <Interactive.Div
        name="Velo superior"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 620,
          background:
            "linear-gradient(180deg, rgba(248,246,240,0.85) 0%, rgba(248,246,240,0.55) 55%, rgba(248,246,240,0) 100%)",
        }}
      />
      <Interactive.Div
        name="Velo inferior"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 520,
          background:
            "linear-gradient(0deg, rgba(21,21,26,0.85) 0%, rgba(21,21,26,0.55) 55%, rgba(21,21,26,0) 100%)",
        }}
      />

      <Interactive.Div
        name="Marca"
        style={{
          position: "absolute",
          left: 96,
          top: 150,
          fontFamily: sans,
          fontWeight: 600,
          fontSize: 30,
          letterSpacing: "0.32em",
          color: "#946437",
          opacity: interpolate(frame, [0.15 * fps, 0.8 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        OSO MATES
      </Interactive.Div>
      <div
        style={{
          position: "absolute",
          left: 96,
          right: 96,
          top: 205,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div style={{ overflow: "hidden", paddingBottom: 16 }}>
          <Interactive.Div
            name="Nombre del mate"
            style={{
              fontFamily: serif,
              fontWeight: 500,
              fontSize: 150,
              lineHeight: 0.95,
              color: "#15151a",
              translate: interpolate(
                frame,
                [0.35 * fps, 1.2 * fps],
                ["0px 110%", "0px 0%"],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.16, 1, 0.3, 1),
                },
              ),
            }}
          >
            {nombre}
          </Interactive.Div>
        </div>
        {material ? (
          <Interactive.Div
            name="Material"
            style={{
              paddingLeft: 4,
              fontFamily: serif,
              fontStyle: "italic",
              fontSize: 54,
              color: "#946437",
              opacity: interpolate(frame, [0.9 * fps, 1.6 * fps], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              translate: interpolate(
                frame,
                [0.9 * fps, 1.6 * fps],
                ["-30px 0px", "0px 0px"],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
                },
              ),
            }}
          >
            {material}
          </Interactive.Div>
        ) : null}
      </div>

      <Interactive.Div
        name="Descripción"
        style={{
          position: "absolute",
          left: 96,
          right: 96,
          bottom: 210,
          fontFamily: serif,
          fontStyle: "italic",
          fontSize: 56,
          lineHeight: 1.15,
          color: "#f8f8f6",
          opacity: interpolate(frame, [2.2 * fps, 3.0 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(
            frame,
            [2.2 * fps, 3.0 * fps],
            ["0px 24px", "0px 0px"],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.61, 1, 0.88, 1),
            },
          ),
        }}
      >
        {descripcion}
      </Interactive.Div>
      <Interactive.Div
        name="Web"
        style={{
          position: "absolute",
          left: 96,
          bottom: 100,
          display: "flex",
          alignItems: "center",
          gap: 24,
          fontFamily: sans,
          fontWeight: 500,
          fontSize: 34,
          letterSpacing: "0.12em",
          color: "#c8956c",
          opacity: interpolate(frame, [4.2 * fps, 4.9 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <div
          style={{
            width: 80,
            height: 3,
            backgroundColor: "#c8956c",
            transformOrigin: "left center",
            scale: interpolate(frame, [4.2 * fps, 4.9 * fps], ["0 1", "1 1"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        />
        osomates.com
      </Interactive.Div>
    </AbsoluteFill>
  );
};
