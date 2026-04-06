interface AppLogoProps {
  variant?: "black" | "white";
}

export const AppLogo = ({ variant = "black" }: AppLogoProps) => {
  const src =
    variant === "white"
      ? "/logos/debridgers-white.png"
      : "/logos/debridgers-black.png";

  return (
    <img src={src} alt="Debridgers Logo" className="h-8 w-auto max-w-50" />
  );
};
