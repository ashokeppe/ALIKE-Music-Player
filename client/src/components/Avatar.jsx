// The round user picture: the chosen photo, or the first letter of the name
export default function Avatar({ user, big = false }) {
  const letter = (user?.name || "?").trim().slice(0, 1).toUpperCase();
  return (
    <span className={`avatar ${big ? "big" : ""}`}>
      {user?.avatar ? <img src={user.avatar} alt="" /> : letter}
    </span>
  );
}
