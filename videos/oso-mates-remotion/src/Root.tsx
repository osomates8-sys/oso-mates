import { Composition, Folder } from "remotion";
import { CardsScene } from "./CardsScene";
import { CloseScene } from "./CloseScene";
import { HookScene } from "./HookScene";
import { OsoMates } from "./OsoMates";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Escenas">
        <Composition id="Gancho" component={HookScene} durationInFrames={78} fps={30} width={1080} height={1920} />
        <Composition id="Tarjetas" component={CardsScene} durationInFrames={95} fps={30} width={1080} height={1920} />
        <Composition id="Cierre" component={CloseScene} durationInFrames={84} fps={30} width={1080} height={1920} />
      </Folder>
      <Composition id="OsoMates" component={OsoMates} durationInFrames={240} fps={30} width={1080} height={1920} />
    </>
  );
};
