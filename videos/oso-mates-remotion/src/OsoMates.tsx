import { AbsoluteFill, useVideoConfig } from "remotion";
import { CardsScene } from "./CardsScene";
import { CloseScene } from "./CloseScene";
import { HookScene } from "./HookScene";

// Video completo: 8 s. La escena de cierre se superpone a la de tarjetas (su panel las tapa).
export const OsoMates = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#15151a" }}>
      <HookScene name="Gancho" from={0} durationInFrames={2.6 * fps} premountFor={fps} />
      <CardsScene name="Tarjetas" from={2.6 * fps} durationInFrames={3.15 * fps} premountFor={fps} />
      <CloseScene name="Cierre" from={5.2 * fps} durationInFrames={2.8 * fps} premountFor={fps} />
    </AbsoluteFill>
  );
};
