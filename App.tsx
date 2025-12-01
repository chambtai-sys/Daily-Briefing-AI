import React, { useState } from 'react';
import { generateBroadcastScript, generateSpeechFromText } from './services/geminiService';
import { mixAudioWithMusic } from './services/audioUtils';
import { LoadingState, VoiceName, MusicStyle, SummaryResult } from './types';
import { VoiceSelector } from './components/VoiceSelector';
import { MusicSelector } from './components/MusicSelector';
import { Player } from './components/Player';

export default function App() {
  const [textInput, setTextInput] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>(VoiceName.Puck);
  const [selectedMusic, setSelectedMusic] = useState<MusicStyle>(MusicStyle.NO_MUSIC);
  
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!textInput.trim()) return;

    setLoadingState(LoadingState.SUMMARIZING);
    setError(null);
    setResult(null);

    try {
      // Step 1: Summarize
      const { title, script } = await generateBroadcastScript(textInput);
      
      setLoadingState(LoadingState.GENERATING_AUDIO);

      // Step 2: TTS
      const audioBase64 = await generateSpeechFromText(script, selectedVoice);

      setLoadingState(LoadingState.MIXING_AUDIO);

      // Step 3: Mix with Music (if selected)
      const finalAudioUrl = await mixAudioWithMusic(audioBase64, selectedMusic);

      setResult({
        title,
        script,
        audioUrl: finalAudioUrl
      });
      setLoadingState(LoadingState.COMPLETE);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong. Please try again.");
      setLoadingState(LoadingState.ERROR);
    }
  };

  const handleReset = () => {
    setResult(null);
    setLoadingState(LoadingState.IDLE);
    setError(null);
    setTextInput('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start p-6 md:p-12 font-sans">
      
      <header className="max-w-3xl w-full mb-10 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-slate-100 mb-4">
          <span className="text-2xl mr-2">🎙️</span>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Daily Briefing AI</h1>
        </div>
        <p className="text-slate-500 text-lg max-w-lg mx-auto leading-relaxed">
          Paste your news articles below, and we'll transform them into a personalized <span className="text-indigo-600 font-semibold">audio podcast</span> for your commute.
        </p>
      </header>

      <main className="max-w-2xl w-full">
        
        {loadingState === LoadingState.IDLE && (
          <div className="space-y-8 animate-fade-in-up">
            
            {/* Input Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <label htmlFor="news-input" className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
                 Paste News Articles
               </label>
               <textarea
                 id="news-input"
                 className="w-full h-48 p-4 text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none text-sm leading-relaxed"
                 placeholder="Paste text from one or more articles here..."
                 value={textInput}
                 onChange={(e) => setTextInput(e.target.value)}
               ></textarea>
               <div className="flex justify-between mt-2 text-xs text-slate-400 px-1">
                 <span>Supports multiple articles</span>
                 <span>{textInput.length} chars</span>
               </div>
            </div>

            {/* Config Grid */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
               <VoiceSelector selectedVoice={selectedVoice} onChange={setSelectedVoice} />
               <MusicSelector selectedMusic={selectedMusic} onChange={setSelectedMusic} />
            </div>

            {/* Action Button */}
            <button
              onClick={handleGenerate}
              disabled={!textInput.trim()}
              className={`
                w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg shadow-indigo-200
                transition-all duration-300 transform
                ${!textInput.trim() 
                  ? 'bg-slate-300 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-1 hover:shadow-xl'}
              `}
            >
              Generate My Briefing
            </button>
          </div>
        )}

        {/* Loading States */}
        {(loadingState !== LoadingState.IDLE && loadingState !== LoadingState.COMPLETE && loadingState !== LoadingState.ERROR) && (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
             <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-3xl">
                   {loadingState === LoadingState.SUMMARIZING ? '📰' : 
                    loadingState === LoadingState.GENERATING_AUDIO ? '🎙️' : '🎹'}
                </div>
             </div>
             <h3 className="text-xl font-bold text-slate-800 mb-2">
               {loadingState === LoadingState.SUMMARIZING ? 'Reading Articles...' : 
                loadingState === LoadingState.GENERATING_AUDIO ? 'Recording Audio...' : 'Mixing Soundtrack...'}
             </h3>
             <p className="text-slate-500">
               {loadingState === LoadingState.SUMMARIZING 
                 ? 'AI is identifying the key facts.' 
                 : loadingState === LoadingState.GENERATING_AUDIO 
                    ? 'AI host is voicing your briefing.'
                    : 'Adding background ambience.'}
             </p>
          </div>
        )}

        {/* Error State */}
        {loadingState === LoadingState.ERROR && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-red-800 font-bold mb-2">Oops!</h3>
            <p className="text-red-600 mb-6">{error}</p>
            <button 
              onClick={() => setLoadingState(LoadingState.IDLE)}
              className="px-6 py-2 bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Result State */}
        {loadingState === LoadingState.COMPLETE && result && (
           <div className="space-y-8 animate-fade-in-up">
              <Player 
                audioUrl={result.audioUrl}
                title={result.title} 
                onReset={handleReset}
              />
              
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                 <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Transcript</h3>
                 <div className="prose prose-slate prose-lg max-w-none">
                    <h2 className="font-serif text-2xl text-slate-900 mb-4">{result.title}</h2>
                    <div className="text-slate-600 leading-relaxed space-y-4 whitespace-pre-wrap font-serif">
                       {result.script}
                    </div>
                 </div>
              </div>
           </div>
        )}

      </main>

      <footer className="mt-20 text-center text-slate-400 text-sm">
        <p>Powered by Gemini 2.5 Flash & TTS</p>
      </footer>
    </div>
  );
}