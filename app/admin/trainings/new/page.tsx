import { TrainingForm } from "@/components/admin/TrainingForm";
import { createTraining } from "@/app/admin/trainings/actions";

export default function NewTrainingPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl text-text">Neues Training</h1>
      <TrainingForm action={createTraining} submitLabel="Anlegen" />
    </div>
  );
}
