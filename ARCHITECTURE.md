# Polling App Architecture

## 🏗️ System Overview

```
Next.js App (Frontend) ←→ Supabase (Backend) ←→ Vercel (Deployment)
```

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/           # Auth routes
│   ├── (polls)/          # Poll routes
│   ├── api/              # API routes
│   └── share/[id]/       # QR landing pages
├── components/
│   ├── ui/               # Shadcn components
│   ├── polls/            # Poll components
│   └── qr/               # QR components
├── lib/
│   ├── supabase/         # Supabase utilities
│   └── utils.ts
├── hooks/                # Custom hooks
└── types/                # TypeScript types
```

## 🗄️ Database Schema

### Core Tables
```sql
-- Polls
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Poll Options
CREATE TABLE poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  order_index INTEGER DEFAULT 0
);

-- Votes
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id, option_id)
);
```

## 🔧 Key Technologies

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** + **Shadcn/ui** for styling
- **Zod** for validation
- **React Hook Form** for forms

### Backend
- **Supabase** for database, auth, and real-time
- **Server Actions** for mutations
- **Edge Functions** for QR generation

### Real-time & QR
- **@supabase/realtime** for live updates
- **qrcode.react** for QR generation
- **html5-qrcode** for QR scanning

## 🚀 Architecture Patterns

### 1. Server-First Data Fetching
```typescript
// Server Components fetch data
export default async function PollPage({ params }: { params: { id: string } }) {
  const poll = await getPoll(params.id);
  return <PollView poll={poll} />;
}
```

### 2. Server Actions for Mutations
```typescript
'use server'
export async function createPoll(formData: FormData) {
  const user = await getSession();
  if (!user) throw new Error('Unauthorized');
  
  const poll = await supabase
    .from('polls')
    .insert({ title: formData.get('title'), created_by: user.id })
    .select()
    .single();
    
  return poll;
}
```

### 3. Real-time Updates
```typescript
export function usePollResults(pollId: string) {
  const [results, setResults] = useState([]);
  
  useEffect(() => {
    const channel = supabase
      .channel(`poll-${pollId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'votes',
        filter: `poll_id=eq.${pollId}`
      }, () => {
        fetchResults(); // Refetch on vote
      })
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  }, [pollId]);
  
  return results;
}
```

## 🔐 Security

### Authentication
- Supabase JWT-based auth
- Secure cookies with httpOnly
- Route protection with middleware

### Data Security
- Row Level Security (RLS) policies
- Input validation with Zod
- Rate limiting on API routes

### Voting Security
```typescript
// Prevent duplicate votes
const existingVote = await supabase
  .from('votes')
  .select()
  .eq('poll_id', pollId)
  .eq('user_id', userId)
  .single();

if (existingVote) {
  throw new Error('Already voted');
}
```

## 📱 QR Code Implementation

### QR Generation
```typescript
import QRCode from 'qrcode.react';

export function QRGenerator({ pollId }: { pollId: string }) {
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/share/${pollId}`;
  
  return (
    <div>
      <QRCode value={shareUrl} size={256} />
      <Button onClick={() => navigator.share({ url: shareUrl })}>
        Share
      </Button>
    </div>
  );
}
```

### QR Scanning
```typescript
import { Html5QrcodeScanner } from 'html5-qrcode';

export function QRScanner({ onScan }: { onScan: (url: string) => void }) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: 250 }
    );
    
    scanner.render((decodedText) => {
      onScan(decodedText);
      scanner.clear();
    });
    
    return () => scanner.clear();
  }, []);
  
  return <div id="qr-reader" />;
}
```

## 🚀 Deployment (Vercel)

### Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Edge Functions
```typescript
// app/api/qr/route.ts
import QRCode from 'qrcode';

export async function POST(request: Request) {
  const { url } = await request.json();
  const qrCode = await QRCode.toDataURL(url);
  return Response.json({ qrCode });
}
```

## 📊 Performance

### Caching
- Static generation for poll pages
- Edge caching with Vercel
- Client-side caching with React Query

### Real-time Optimization
- Selective subscriptions
- Debounced updates
- Connection management

### Bundle Optimization
- Code splitting
- Tree shaking
- Image optimization

## 🔄 Development Workflow

### Local Development
```bash
npm run dev          # Start dev server
npm run db:push      # Push schema to Supabase
npm run test         # Run tests
npm run lint         # Lint code
```

### Testing Strategy
- Unit tests with Jest
- Integration tests for API routes
- E2E tests with Playwright

This architecture provides a solid foundation for a scalable polling app with real-time capabilities and QR code functionality.
