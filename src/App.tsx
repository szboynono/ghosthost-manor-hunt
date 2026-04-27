import { GameProvider, useGame } from "./context/GameContext";
import { DiscordProvider } from "./discord/DiscordContext";
import { SessionProvider } from "./session/SessionContext";
import MainMenu from "./screens/MainMenu";
import Lobby from "./screens/Lobby";
import RoleReveal from "./screens/RoleReveal";
import GameBoard from "./screens/GameBoard";
import ResultScreen from "./screens/ResultScreen";
import DemoScreen from "./screens/DemoScreen";

function Router() {
  const { screen } = useGame();
  switch (screen) {
    case "mainMenu":   return <MainMenu />;
    case "lobby":      return <Lobby />;
    case "roleReveal": return <RoleReveal />;
    case "gameBoard":  return <GameBoard />;
    case "result":     return <ResultScreen />;
    case "demo":       return <DemoScreen />;
    default:           return <MainMenu />;
  }
}

export default function App() {
  return (
    <DiscordProvider>
      <SessionProvider>
        <GameProvider>
          <div className="app-shell">
            <Router />
          </div>
        </GameProvider>
      </SessionProvider>
    </DiscordProvider>
  );
}
