-- PostgreSQL Database Schema for Chinese-Vietnamese SRS Vocabulary App

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Linked to Supabase Auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    streak INT DEFAULT 0 NOT NULL,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Trigger to automatically create profile on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url, streak)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'display_name', new.email),
        new.raw_user_meta_data->>'avatar_url',
        0
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. Radicals Table (Chinese radicals)
CREATE TABLE public.radicals (
    id SERIAL PRIMARY KEY,
    character TEXT UNIQUE NOT NULL,
    pinyin TEXT NOT NULL,
    vietnamese_name TEXT NOT NULL,
    stroke_count INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Radicals (Read-only for users, writes managed by admin/seeding)
ALTER TABLE public.radicals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view radicals" 
    ON public.radicals FOR SELECT 
    USING (true);


-- 3. Vocabulary Table (Shared Vocabulary Pool)
CREATE TABLE public.vocabulary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simplified TEXT UNIQUE NOT NULL,
    traditional TEXT,
    pinyin TEXT NOT NULL,
    han_viet TEXT NOT NULL,
    definition_vi TEXT NOT NULL,
    audio_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Vocabulary
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vocabulary" 
    ON public.vocabulary FOR SELECT 
    USING (true);

CREATE POLICY "Authenticated users can insert vocabulary" 
    ON public.vocabulary FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);


-- 4. Vocabulary_Radicals Table (Many-to-Many relationship)
CREATE TABLE public.vocabulary_radicals (
    vocabulary_id UUID REFERENCES public.vocabulary(id) ON DELETE CASCADE,
    radical_id INT REFERENCES public.radicals(id) ON DELETE CASCADE,
    PRIMARY KEY (vocabulary_id, radical_id)
);

-- Enable RLS on Vocabulary_Radicals
ALTER TABLE public.vocabulary_radicals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vocabulary radicals" 
    ON public.vocabulary_radicals FOR SELECT 
    USING (true);

CREATE POLICY "Authenticated users can link vocabulary and radicals" 
    ON public.vocabulary_radicals FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);


-- 5. User Progress Table (Private SRS tracking)
CREATE TABLE public.user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    vocabulary_id UUID REFERENCES public.vocabulary(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'learning' NOT NULL CHECK (status IN ('learning', 'reviewing', 'mastered')),
    interval_days INT DEFAULT 0 NOT NULL,
    ease_factor DOUBLE PRECISION DEFAULT 2.5 NOT NULL,
    repetitions INT DEFAULT 0 NOT NULL,
    next_review_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, vocabulary_id)
);

-- Indexing for quick SRS queue retrieval
CREATE INDEX idx_user_progress_next_review ON public.user_progress (user_id, next_review_at);

-- Enable RLS on User Progress (Strictly isolated by user_id)
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress" 
    ON public.user_progress FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" 
    ON public.user_progress FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" 
    ON public.user_progress FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress" 
    ON public.user_progress FOR DELETE 
    USING (auth.uid() = user_id);
