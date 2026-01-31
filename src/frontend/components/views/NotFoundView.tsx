import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotFoundView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-12">
      <div className="panel max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <AlertTriangle className="w-16 h-16 text-retro-red" />
        </div>

        <h1 className="text-4xl font-bold text-retro-red font-mono mb-2">
          404
        </h1>

        <div className="font-mono text-gold-dim text-sm uppercase tracking-wider mb-6">
          :: ROUTE NOT FOUND ::
        </div>

        <p className="text-gold-dim mb-8 font-mono text-sm">
          The requested endpoint does not exist in the system registry.
        </p>

        <Link to="/dashboard" className="btn-gold active inline-block">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
