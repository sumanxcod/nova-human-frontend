export default function AboutPage() {
  return (
    <div className="flex items-center justify-center min-h-screen px-6">
      <div className="max-w-2xl w-full bg-white/5 border border-white/10 rounded-xl p-8 space-y-6">

        <h1 className="text-2xl font-semibold">About Nova</h1>

        <p className="text-zinc-300">
          Nova is built to be more than a chatbot. It is designed as a life partner that helps you think clearly, make better decisions, and move forward in real life.
        </p>

        <div>
          <h2 className="text-lg font-medium mb-2">Why Nova exists</h2>
          <p className="text-zinc-400">
            Most AI tools only give answers. Nova is built to help you take action. Whether you're stuck, confused, or trying to build something meaningful, Nova is here to guide you forward.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-medium mb-2">What makes Nova different</h2>
          <p className="text-zinc-400">
            Nova adapts to your situation. It doesn't overload you with information. It gives you exactly what you need — whether it's a quick answer, a deep explanation, or a clear next step.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-medium mb-2">Privacy</h2>
          <p className="text-zinc-400">
            Your data belongs to you. Conversations are private and tied to your account. Nova does not share your data.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-medium mb-2">About the creator</h2>
          <p className="text-zinc-400">
            Nova is created by Suman Singh Dhami, a computer science student focused on building technology that genuinely helps people improve their lives.
          </p>
        </div>

      </div>
    </div>
  );
}
