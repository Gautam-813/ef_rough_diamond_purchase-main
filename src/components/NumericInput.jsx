export default function NumericInput({ value, onChange, placeholder, isEdited }) {
  return (
    <input
      type="text"
      className={`ni ${isEdited ? "ni-edit" : ""}`}
      value={value}
      placeholder={placeholder}
      onChange={(e) => {
        const val = e.target.value;
        if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
            onChange(val);
        }
      }}
    />
  );
}
