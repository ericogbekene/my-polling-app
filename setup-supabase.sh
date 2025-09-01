#!/bin/bash

echo "🚀 Supabase Setup Helper"
echo "========================"
echo ""

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "✅ .env.local already exists"
else
    echo "📝 Creating .env.local template..."
    cat > .env.local << EOF
# Supabase Configuration
# Get these values from your Supabase project dashboard
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Optional: Service role key for admin operations (server-side only)
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# NextAuth URL (if you add NextAuth later)
NEXTAUTH_URL=http://localhost:3000
EOF
    echo "✅ Created .env.local template"
fi

echo ""
echo "📋 Next Steps:"
echo "1. Go to https://supabase.com and create a new project"
echo "2. Copy your Project URL and anon key from Settings → API"
echo "3. Update .env.local with your actual values"
echo "4. Configure authentication settings in Supabase dashboard"
echo "5. Run 'npm run dev' to test your setup"
echo ""
echo "📖 See SUPABASE_SETUP.md for detailed instructions"
echo ""
