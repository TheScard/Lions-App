import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TrainingForm } from "@/components/admin/TrainingForm";
import { updateTraining } from "@/app/admin/trainings/actions";

export default async function EditTrainingPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: training } = await supabase
    .from("trainings")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!training) {
    notFound();
  }

  const action = updateTraining.bind(null, training.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl text-text">Training bearbeiten</h1>
      <TrainingForm action={action} submitLabel="Speichern" initialValues={training} />
    </div>
  );
}
