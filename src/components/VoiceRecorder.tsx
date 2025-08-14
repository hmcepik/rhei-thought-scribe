import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { VoiceNote } from "@/types/VoiceNote";
import "@/types/VoiceNote"; // Import speech recognition types

const VoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedTags, setGeneratedTags] = useState<string[]>([]);
  const [summary, setSummary] = useState("");
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Keywords for auto-tagging
  const keywords = {
    'Marketing': ['marketing', 'campaign', 'brand', 'customer', 'sales', 'promotion', 'advertising', 'social media', 'content', 'seo', 'analytics'],
    'Engineering': ['code', 'development', 'software', 'technical', 'bug', 'programming', 'api', 'database', 'frontend', 'backend', 'deployment'],
    'Meeting': ['meeting', 'discussion', 'agenda', 'notes', 'decision', 'action', 'follow-up', 'call', 'conference', 'sync', 'standup'],
    'Project': ['project', 'timeline', 'milestone', 'deadline', 'task', 'deliverable', 'presentation', 'powerpoint', 'slides', 'demo', 'proposal'],
    'Finance': ['budget', 'cost', 'revenue', 'financial', 'money', 'expense', 'profit', 'invoice', 'payment', 'pricing'],
    'HR': ['team', 'hiring', 'employee', 'training', 'performance', 'review', 'staff', 'onboarding', 'interview'],
    'Personal': ['idea', 'thought', 'reminder', 'todo', 'personal', 'note', 'remember', 'inspiration', 'brainstorm'],
  };

  useEffect(() => {
    // Check if speech recognition is supported
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      toast.error("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      toast.success("Recording started");
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setTranscription(prev => prev + finalTranscript);
      }
      
      setCurrentTranscript(interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      toast.error(`Recording error: ${event.error}`);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setCurrentTranscript("");
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);


  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      setTranscription("");
      setCurrentTranscript("");
      setGeneratedTags([]);
      setSummary("");
      recognitionRef.current.start();
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  };

  const generateTags = (text: string): string[] => {
    const foundTags: string[] = [];
    const lowerText = text.toLowerCase();
    
    console.log('Generating tags for text:', lowerText);
    
    Object.entries(keywords).forEach(([category, words]) => {
      const matchedWords = words.filter(word => lowerText.includes(word));
      if (matchedWords.length > 0) {
        console.log(`Found category "${category}" with words:`, matchedWords);
        foundTags.push(category);
      }
    });
    
    console.log('Generated tags:', foundTags);
    return foundTags;
  };

  const generateSummary = (text: string): string => {
    if (text.length < 50) return "";
    
    // Simple AI-like summary generation
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length <= 2) return "";
    
    // Take every other sentence or key sentences (simple heuristic)
    const keySentences = sentences.filter((_, index) => index % 2 === 0 || sentences[index]?.includes('important') || sentences[index]?.includes('action'));
    
    return keySentences.slice(0, 3).map(s => `• ${s.trim()}`).join('\n');
  };

  const saveNote = () => {
    if (!transcription.trim()) {
      toast.error("No transcription to save");
      return;
    }

    setIsProcessing(true);
    
    // Generate tags and summary
    const tags = generateTags(transcription);
    const noteSummary = generateSummary(transcription);
    
    const note: VoiceNote = {
      id: Date.now().toString(),
      transcription: transcription.trim(),
      summary: noteSummary || undefined,
      tags: tags,
      timestamp: new Date(),
    };

    // Save to localStorage
    const existingNotes = JSON.parse(localStorage.getItem('rhei-voice-notes') || '[]');
    const updatedNotes = [note, ...existingNotes];
    localStorage.setItem('rhei-voice-notes', JSON.stringify(updatedNotes));

    setGeneratedTags(tags);
    setSummary(noteSummary);
    setIsProcessing(false);
    
    toast.success("Note saved successfully!");
    
    // Reset for next recording
    setTimeout(() => {
      setTranscription("");
      setGeneratedTags([]);
      setSummary("");
    }, 2000);
  };

  const displayText = transcription + currentTranscript;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Recording Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            className={`record-button ${isRecording ? 'recording' : 'inactive'} w-32 h-32 rounded-full text-white font-semibold text-lg shadow-lg`}
            style={{
              backgroundColor: isRecording ? 'hsl(var(--recording-active))' : 'hsl(var(--rhei-primary))',
            }}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
          >
            {isRecording ? (
              <>
                <MicOff className="w-8 h-8 mb-2" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Mic className="w-8 h-8 mb-2" />
                <span>Record</span>
              </>
            )}
          </Button>
        </div>

        {/* Status */}
        <div className="text-center">
          <p className="text-lg font-medium">
            {isRecording ? (
              <span className="text-recording-active">🔴 Recording...</span>
            ) : transcription ? (
              <span className="text-rhei-success">✅ Recording complete</span>
            ) : (
              <span className="text-muted-foreground">Click to start recording</span>
            )}
          </p>
        </div>

        {/* Live Transcription */}
        {displayText && (
          <Card className="note-card">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-3">Live Transcription</h3>
                  <Textarea
                    value={displayText}
                    onChange={(e) => setTranscription(e.target.value)}
                    placeholder="Your transcription will appear here..."
                    className="min-h-32 fade-in"
                    readOnly={isRecording}
                  />
                </div>

                {generatedTags.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Auto-generated Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {generatedTags.map((tag) => (
                        <Badge key={tag} className="tag-badge">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {summary && (
                  <div>
                    <h4 className="font-medium mb-2">AI Summary</h4>
                    <div className="bg-muted p-3 rounded-md">
                      <pre className="text-sm whitespace-pre-wrap">{summary}</pre>
                    </div>
                  </div>
                )}

                {transcription && !isRecording && (
                  <div className="flex justify-end">
                    <Button 
                      onClick={saveNote} 
                      disabled={isProcessing}
                      className="flex items-center space-x-2"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>{isProcessing ? "Saving..." : "Save Note"}</span>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <h4 className="font-medium mb-2">How to use:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Click the record button to start voice recording</li>
              <li>• Speak clearly - transcription appears in real-time</li>
              <li>• Recording continues until you click stop</li>
              <li>• Edit transcription if needed, then save your note</li>
              <li>• Tags and summaries are generated automatically</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VoiceRecorder;