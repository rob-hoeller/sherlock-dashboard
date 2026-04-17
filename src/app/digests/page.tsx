import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Digests | Task Management",
  description: "View and manage digests",
};

export default function DigestsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Digests</h1>
      <div className="bg-card rounded-lg p-6">
        <p className="text-muted-foreground">Digests content coming soon...</p>
      </div>
    </div>
  );
}