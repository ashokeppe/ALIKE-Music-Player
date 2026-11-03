import Icon from "../icons.jsx";

// The ALIKE logo: the music icon beside the name. The text uses the theme's text color (white on dark
// themes, dark on the light theme) and the icon uses the theme's accent color, so both follow the theme.
export default function Brand({ icon = true }) {
  return (
    <span className="brand-lockup">
      {icon && <Icon name="library" size={20} />}
      <span>ALIKE</span>
    </span>
  );
}
