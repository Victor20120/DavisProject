interface MedResult {
  med_name: string;
  dosage: string;
  plain_english: string;
  conflicts: string[];
  take_with_food: boolean;
}

export default function MedCard({ result }: { result: MedResult }) {
  return (
    <div>
      <h2>{result.med_name}</h2>
      <p>{result.plain_english}</p>
    </div>
  );
}
