import { Composition, Folder } from "remotion";
import { CardsScene } from "./CardsScene";
import { CloseScene } from "./CloseScene";
import { HookScene } from "./HookScene";
import { MateVideo } from "./MateVideo";
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
      <Folder name="Mates">
        <Composition
          id="Imperial"
          component={MateVideo}
          durationInFrames={210}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            nombre: "Imperial",
            material: "Calabaza",
            descripcion: "La tradición en su forma más pura. Un sabor único en cada cebada.",
            fondo: "mates/cocina.png",
            recorte: "mates/imperial.png",
            encuadre: "50% 50%",
          }}
        />
        <Composition
          id="Criollo"
          component={MateVideo}
          durationInFrames={210}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            nombre: "Criollo",
            material: "",
            descripcion: "Fiel a sus raíces. El mate de toda la vida hecho con el cuidado de siempre.",
            fondo: "mates/cocina.png",
            recorte: "mates/criollo.png",
            encuadre: "50% 50%",
          }}
        />
        <Composition
          id="ImperialAlgarrobo"
          component={MateVideo}
          durationInFrames={210}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            nombre: "Imperial Algarrobo",
            material: "Madera de algarrobo",
            descripcion: "Porte elegante y tamaño generoso. El preferido de los entendidos.",
            fondo: "mates/imperial-algarrobo-muftpl9nujl.webp",
            recorte: "",
            encuadre: "52% 60%",
          }}
        />
        <Composition
          id="Camionero"
          component={MateVideo}
          durationInFrames={210}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            nombre: "Camionero",
            material: "Madera de algarrobo",
            descripcion: "El clásico resistente. Forma robusta y cómoda, ideal para el día a día.",
            fondo: "mates/camionero-muftpmhoz9y.webp",
            recorte: "",
            encuadre: "47% 55%",
          }}
        />
        <Composition
          id="Ranchero"
          component={MateVideo}
          durationInFrames={210}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            nombre: "Ranchero",
            material: "",
            descripcion: "Para los que van en serio. Grande, noble y con mucha personalidad.",
            fondo: "mates/cocina.png",
            recorte: "mates/ranchero.png",
            encuadre: "50% 50%",
          }}
        />
        <Composition
          id="Galleta"
          component={MateVideo}
          durationInFrames={210}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            nombre: "Galleta",
            material: "",
            descripcion: "Forma redondeada y clásica, perfecta para cebar.",
            fondo: "mates/galleta-muftpryxvqj.webp",
            recorte: "",
            encuadre: "51% 61%",
          }}
        />
      </Folder>
    </>
  );
};
