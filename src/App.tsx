import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLocalStorage, useToggle } from "@uidotdev/usehooks";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Upload,
  Trash2,
  Check,
  Copy,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { WorkoutCard } from "./components/WorkoutCard";
import { Carousel } from "./components/Carousel";
import { ScrollSnapContainer } from "./components/ScrollSnapContainer";
import { ScrollSnapSection } from "./components/ScrollSnapSection";
import { BottomNav } from "./components/BottomNav";
import { TestDataButton } from "./components/TestDataButton";
import { ProgressTab } from "./components/ProgressTab";
import {
  dbHelpers,
  initializeDefaultBlock,
  Workout,
  Block,
} from "./lib/database";
import "./App.css";

const AI_COPY_TEMPLATE = `Generate a workout in TSV (Tab-Separated Values) format with these specifications:\n\nIMPORTANT: Use TAB characters (\\t) as delimiters, NOT commas. This allows text fields to contain commas and punctuation.\n\nRequired columns: block_id, day, exercise_name, category, type, sets, rest, cues\nOptional columns: reps, weight, duration, guidance, resistance, description\n\nCategories: Intent (mental prep), Warm-up, Primary, Secondary, Additional, Cool-down\nTypes: weights, time, mindset\n\nStart each workout with an Intent exercise (category=Intent, type=mindset) for mental preparation.\n\nUse guidance for instructions like "70% 1RM" or "per side".\nUse resistance for non-weight exercises like "Red band" or "Bodyweight".\nUse description for detailed exercise setup and execution (e.g., "Stand with feet shoulder-width apart, toes slightly out. Lower until thighs parallel to ground, keeping chest up. Drive through heels to return to standing.").\n\nExample format (columns separated by TAB characters):\nblock_id\\tday\\texercise_name\\tcategory\\ttype\\tsets\\treps\\tweight\\tduration\\trest\\tcues\\tguidance\\tresistance\\tdescription\nWeek 1\\tDay 1\\tFocus\\tIntent\\tmindset\\t1\\t\\t\\t2\\t0\\tToday's goal: build power, focus on explosive movement\\t\\t\\t\nWeek 1\\tDay 1\\tSquats\\tPrimary\\tweights\\t3\\t10\\t100\\t\\t90\\tKeep chest up, drive through heels\\t70% 1RM\\t\\tStand with feet shoulder-width apart, toes slightly out. Lower until thighs parallel to ground, keeping chest up. Drive through heels to return to standing.\nWeek 1\\tDay 1\\tBand Pull\\tAdditional\\tweights\\t3\\t15\\t\\t\\t60\\tControl the movement, squeeze at the top\\t\\tRed band\\t`;

const APP_VERSION = "v1.2.0";
const CATEGORIES = [
  "Intent",
  "Warm-up",
  "Primary",
  "Secondary",
  "Additional",
  "Cool-down",
];
const EXPORT_HEADERS = [
  "block_id",
  "day",
  "exercise_name",
  "category",
  "type",
  "sets",
  "reps",
  "weight",
  "duration",
  "rest",
  "cues",
  "guidance",
  "resistance",
  "description",
  "set_number",
  "completed_reps",
  "completed_weight",
  "completed_duration",
  "completed_at",
  "notes",
];

type WorkoutWithLogged = Workout & { logged_sets?: any[] };

function App() {
  const [activeTab, setActiveTab] = useState("workouts");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [activeBlock, setActiveBlock] = useState<Block | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useToggle(false);
  const [blockDialogOpen, setBlockDialogOpen] = useToggle(false);
  const [showImportSuccess, setShowImportSuccess] = useToggle(false);
  const [showExportSuccess, setShowExportSuccess] = useToggle(false);
  const [showCopySuccess, setShowCopySuccess] = useToggle(false);
  const [validationDialogOpen, setValidationDialogOpen] = useToggle(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [pendingImportData, setPendingImportData] = useState<{
    workoutData: any[];
    blockIds: Set<string>;
  } | null>(null);
  // Using a local Set for blockIds during import
  const [darkMode, setDarkMode] = useLocalStorage<boolean>("darkMode", false);

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    if (activeBlock) {
      loadWorkoutsForBlock(activeBlock.block_id);
    }
  }, [activeBlock]);

  const initializeApp = async () => {
    try {
      await initializeDefaultBlock();
      await loadBlocks();
    } catch (error) {
      console.error("Error initializing app:", error);
    }
  };

  const loadBlocks = async () => {
    try {
      const allBlocks = await dbHelpers.getAllBlocks();

      // Filter blocks that have at least one workout
      const blocksWithWorkouts = await Promise.all(
        allBlocks.map(async (block) => {
          const workouts = await dbHelpers.getWorkoutsByBlock(block.block_id);
          return workouts.length > 0 ? block : null;
        }),
      );

      const validBlocks = blocksWithWorkouts.filter(
        (block): block is Block => block !== null,
      );

      // Sort blocks alphabetically by block_name
      const sortedBlocks = validBlocks.sort((a, b) =>
        a.block_name.localeCompare(b.block_name),
      );
      setBlocks(sortedBlocks);

      const active = await dbHelpers.getActiveBlock();
      if (active) {
        setActiveBlock(active);
      } else if (allBlocks.length > 0) {
        setActiveBlock(allBlocks[0]);
        await dbHelpers.setActiveBlock(allBlocks[0].block_id);
      }
    } catch (error) {
      console.error("Error loading blocks:", error);
    }
  };

  const loadWorkoutsForBlock = async (blockId: string) => {
    try {
      const blockWorkouts = await dbHelpers.getWorkoutsByBlock(blockId);
      setWorkouts(blockWorkouts);

      const daysArr = blockWorkouts.map((w) => w.day);
      const days = daysArr.filter((d, i) => daysArr.indexOf(d) === i).sort();
      setAvailableDays(days);

      if (days.length > 0 && !days.includes(selectedDay)) {
        setSelectedDay(days[0]);
      }
    } catch (error) {
      console.error("Error loading workouts:", error);
    }
  };

  const handleFileImport = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());
      // Support both TSV (tab) and CSV (comma) formats
      const delimiter = lines[0].includes("\t") ? "\t" : ",";
      const headers = lines[0].split(delimiter).map((h) => h.trim());

      const workoutData: Omit<Workout, "id">[] = [];
      const blockIds = new Set<string>();
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map((v) => v.trim());
        if (values.length < headers.length) continue;

        const workout: any = {};
        headers.forEach((header, index) => {
          const value = values[index];
          switch (header.toLowerCase()) {
            case "block_id":
            case "week_id": // Support legacy format
              workout.block_id = value;
              blockIds.add(value);
              break;
            case "day":
              workout.day = value;
              break;
            case "exercise_name":
              workout.exercise_name = value;
              break;
            case "category":
              workout.category = value;
              break;
            case "type":
              workout.type = value;
              break;
            case "sets":
              workout.sets = parseInt(value) || 1;
              break;
            case "reps":
              workout.reps = value ? parseInt(value) : undefined;
              break;
            case "weight":
              // Only parse if it's a valid number, ignore text
              const weightNum = parseFloat(value);
              workout.weight = !isNaN(weightNum) ? weightNum : undefined;
              break;
            case "duration":
              workout.duration = value ? parseFloat(value) : undefined;
              break;
            case "rest":
              workout.rest = parseInt(value) || 0;
              break;
            case "cues":
              workout.cues = value || "";
              break;
            case "guidance":
              workout.guidance = value || undefined;
              break;
            case "resistance":
              workout.resistance = value || undefined;
              break;
            case "description":
              workout.description = value || undefined;
              break;
          }
        });

        workoutData.push(workout);
      }

      // Validate data - check for required fields
      workoutData.forEach((workout, index) => {
        if (!workout.block_id)
          errors.push(`Row ${index + 2}: Missing block_id`);
        if (!workout.day) errors.push(`Row ${index + 2}: Missing day`);
        if (!workout.exercise_name)
          errors.push(`Row ${index + 2}: Missing exercise_name`);
        if (!workout.category)
          errors.push(`Row ${index + 2}: Missing category`);
        if (!workout.type) errors.push(`Row ${index + 2}: Missing type`);
      });

      // Set preview data (first 5 rows)
      setPreviewData(workoutData.slice(0, 5));
      setValidationErrors(errors);
      setPendingImportData({ workoutData, blockIds });
      setValidationDialogOpen(true);

      event.target.value = "";
    } catch (error) {
      console.error("Error parsing CSV:", error);
      alert("Error parsing CSV file. Please check the format.");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmImport = async () => {
    if (!pendingImportData) return;

    setIsLoading(true);
    setValidationDialogOpen(false);

    try {
      // Clear all existing data before import
      await dbHelpers.clearAllData();

      const { workoutData, blockIds } = pendingImportData;

      // Create blocks if they don't exist
      const blockIdArray: string[] = [];
      blockIds.forEach((id) => blockIdArray.push(id));
      for (let i = 0; i < blockIdArray.length; i++) {
        const blockId = blockIdArray[i];
        const existingBlock = await dbHelpers
          .getAllBlocks()
          .then((blocks) => blocks.find((b) => b.block_id === blockId));

        if (!existingBlock) {
          await dbHelpers.createBlock({
            block_id: blockId,
            block_name: blockId,
            is_active: 0,
            created_at: new Date(),
          });
        }
      }

      await dbHelpers.importWorkouts(workoutData);
      await loadBlocks();

      // Show success feedback
      setShowImportSuccess(true);
      setTimeout(() => setShowImportSuccess(false), 2000);

      setPendingImportData(null);
      setPreviewData([]);
      setValidationErrors([]);
    } catch (error) {
      console.error("Error importing CSV:", error);
      alert("Error importing CSV file. Please check the format.");
    } finally {
      setIsLoading(false);
    }
  };

  const cancelImport = () => {
    setValidationDialogOpen(false);
    setPendingImportData(null);
    setPreviewData([]);
    setValidationErrors([]);
  };

  const exportBlockData = async () => {
    if (!activeBlock) return;

    try {
      const { workouts, progress } = await dbHelpers.exportBlockData(
        activeBlock.block_id,
      );

      // Build a combined TSV of workouts with their progress (one row per progress set; workouts with no progress have a single row with empty progress fields)
      const progressByWorkoutId = new Map<number, any[]>();
      progress.forEach((p: any) => {
        const list = progressByWorkoutId.get(p.workout_id) || [];
        list.push(p);
        progressByWorkoutId.set(p.workout_id, list);
      });

      const tsvContent = [
        EXPORT_HEADERS.join("\t"),
        ...workouts.flatMap((workout) => {
          const rows = progressByWorkoutId.get(workout.id!) || [null];
          return rows.map((p) =>
            EXPORT_HEADERS.map((header) => {
              switch (header) {
                case "set_number":
                case "completed_reps":
                case "completed_weight":
                case "completed_duration":
                case "notes":
                  return p ? ((p as any)[header] ?? "") : "";
                case "completed_at":
                  return p && p.completed_at
                    ? new Date(p.completed_at).toISOString()
                    : "";
                default:
                  return (workout as any)[header] ?? "";
              }
            }).join("\t"),
          );
        }),
      ].join("\n");

      const blob = new Blob([tsvContent], {
        type: "text/tab-separated-values",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fitflow-${activeBlock.block_id}.tsv`;
      a.click();
      URL.revokeObjectURL(url);

      // Show success feedback
      setShowExportSuccess(true);
      setTimeout(() => setShowExportSuccess(false), 2000);
    } catch (error) {
      console.error("Error exporting data:", error);
    }
  };

  const handleClearDatabase = async () => {
    if (
      confirm(
        "Are you sure you want to clear all workout data? This cannot be undone.",
      )
    ) {
      try {
        await dbHelpers.clearAllData();
        await initializeApp();
      } catch (error) {
        console.error("Error clearing database:", error);
      }
    }
  };

  const handleBlockSelect = (block: Block) => {
    setActiveBlock(block);
    dbHelpers.setActiveBlock(block.block_id);
    setBlockDialogOpen(false);
  };

  const navigateBlock = (direction: "prev" | "next") => {
    if (!activeBlock || blocks.length === 0) return;

    const currentIndex = blocks.findIndex(
      (b) => b.block_id === activeBlock.block_id,
    );
    let newIndex;

    if (direction === "prev") {
      newIndex = currentIndex > 0 ? currentIndex - 1 : blocks.length - 1;
    } else {
      newIndex = currentIndex < blocks.length - 1 ? currentIndex + 1 : 0;
    }

    const newBlock = blocks[newIndex];
    setActiveBlock(newBlock);
    dbHelpers.setActiveBlock(newBlock.block_id);
  };

  const getDayWorkouts = () => {
    if (!selectedDay) return [];
    return workouts.filter((w) => w.day === selectedDay);
  };

  const groupWorkoutsByCategory = (workouts: Workout[]) => {
    const categories = CATEGORIES;
    return categories.reduce(
      (acc, category) => {
        const categoryWorkouts = workouts.filter(
          (w) => w.category === category,
        );
        if (categoryWorkouts.length > 0) {
          acc[category] = categoryWorkouts;
        }
        return acc;
      },
      {} as Record<string, Workout[]>,
    );
  };
  const renderWorkoutsTab = () => {
    // Show blank screen only if no blocks exist
    if (!activeBlock || blocks.length === 0) {
      return (
        <div className="flex items-center justify-center h-[70vh]">
          <h1 className="text-4xl font-bold text-gray-300 dark:text-gray-600">
            FitFlow
          </h1>
        </div>
      );
    }

    return (
      <div className="md:space-y-3 md:pb-20">
        {/* Modern Minimal Block and Day Selector */}
        <div className="flex items-center justify-between px-4 py-3 md:px-1">
          <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
            <DialogTrigger asChild>
              <button className="text-lg font-bold hover:text-blue-600 transition-colors">
                {activeBlock?.block_name}
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader className="">
                <DialogTitle className="">Select Block</DialogTitle>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto space-y-2">
                {blocks.map((block) => (
                  <Button
                    key={block.block_id}
                    variant={
                      activeBlock?.block_id === block.block_id
                        ? "default"
                        : "outline"
                    }
                    className="w-full justify-start"
                    size="sm"
                    onClick={() => handleBlockSelect(block)}
                  >
                    <div className="text-left">
                      <div className="font-semibold">{block.block_name}</div>
                      <div className="text-xs opacity-70">{block.block_id}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateBlock("prev")}
              className=""
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateBlock("next")}
              className=""
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Day Pills */}
        {availableDays.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pb-3 md:px-1">
            {availableDays.map((day) => (
              <button key={day} onClick={() => setSelectedDay(day)}>
                {day}
              </button>
            ))}
          </div>
        )}

        {/* Workouts */}
        {selectedDay && (
          <>
            {/* Desktop view - traditional list layout */}
            <div className="hidden md:block space-y-4">
              {Object.entries(groupWorkoutsByCategory(getDayWorkouts())).map(
                ([category, categoryWorkouts]) => (
                  <div key={category}>
                    <h3 className="font-semibold text-lg mb-3 flex items-center space-x-2">
                      <span>{category}</span>
                      <Badge variant="secondary" className="text-xs">
                        {categoryWorkouts.length}
                      </Badge>
                    </h3>
                    <div className="flex flex-col gap-3">
                      {categoryWorkouts.map((workout) => (
                        <WorkoutCard
                          key={workout.id}
                          workout={workout}
                          onProgressUpdate={() => {}}
                        />
                      ))}
                    </div>
                  </div>
                ),
              )}
            </div>

            {/* Mobile view - scroll snap sections */}
            <ScrollSnapContainer>
              {Object.entries(groupWorkoutsByCategory(getDayWorkouts())).map(
                ([category, categoryWorkouts]) => (
                  <ScrollSnapSection key={category}>
                    <h3 className="font-semibold text-2xl mb-4 flex items-center space-x-2">
                      <span>{category}</span>
                      <Badge variant="secondary" className="text-xs">
                        {categoryWorkouts.length}
                      </Badge>
                    </h3>
                    <div className="flex-1 flex items-center justify-center">
                      <Carousel
                        items={categoryWorkouts}
                        renderItem={(workout) => (
                          <WorkoutCard
                            workout={workout}
                            onProgressUpdate={() => {}}
                          />
                        )}
                        className="w-[85vw] max-w-md"
                      />
                    </div>
                  </ScrollSnapSection>
                ),
              )}
            </ScrollSnapContainer>
          </>
        )}

        {availableDays.length === 0 && (
          <Card className="">
            <CardContent className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No workouts for this block</h3>
              <p className="text-muted-foreground mb-4">
                Import a TSV or CSV file to get started
              </p>
              <Button
                onClick={() => setActiveTab("config")}
                variant="default"
                size="sm"
                className=""
              >
                Import Workouts
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderConfigTab = () => (
    <div className="space-y-4 pb-20">
      <Card className="">
        <CardHeader className="">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Import Workouts</span>
            </CardTitle>
            <span className="text-xs text-muted-foreground">{APP_VERSION}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a TSV (recommended) or CSV file with your workout routines.
            Required columns: block_id, day, exercise_name, category, type,
            sets, rest, cues. Optional: reps, weight, duration, guidance,
            resistance, description.
          </p>
          <div className="space-y-2">
            <input
              type="file"
              accept=".tsv,.csv,.txt"
              onChange={handleFileImport}
              className="hidden"
              id="csv-upload"
              disabled={isLoading}
            />
            <Popover open={showImportSuccess}>
              <PopoverTrigger asChild className="">
                <Button
                  onClick={() => document.getElementById("csv-upload")?.click()}
                  disabled={isLoading}
                  className="w-full"
                  variant="default"
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isLoading ? "Importing..." : "Choose TSV/CSV File"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" side="top">
                <div className="flex items-center space-x-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>Imported successfully</span>
                </div>
              </PopoverContent>
            </Popover>
            <TestDataButton />
            {activeBlock && (
              <Popover open={showExportSuccess}>
                <PopoverTrigger asChild className="">
                  <Button
                    onClick={exportBlockData}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    Export Current Block
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" side="top">
                  <div className="flex items-center space-x-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Exported successfully</span>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <Button
              onClick={handleClearDatabase}
              variant="destructive"
              className="w-full"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="">
        <CardHeader className="">
          <CardTitle className="">AI Workout Generation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p className="font-medium">
              Copy instructions + example for AI tools (ChatGPT, Claude, etc.):
            </p>
            <div className="bg-muted p-3 rounded text-xs space-y-2">
              <p>
                <strong>Required fields:</strong> block_id, day, exercise_name,
                category, type, sets, rest, cues
              </p>
              <p>
                <strong>Optional fields:</strong> reps, weight, duration,
                guidance, resistance, description
              </p>
              <p>
                <strong>Categories:</strong> Intent, Warm-up, Primary,
                Secondary, Additional, Cool-down
              </p>
              <p>
                <strong>Types:</strong> weights, time, mindset
              </p>
              <p>
                <strong>Intent exercises:</strong> Use category=Intent,
                type=mindset for mental prep
              </p>
              <p>
                <strong>Guidance:</strong> Instructions like "70% 1RM" or "per
                side"
              </p>
              <p>
                <strong>Resistance:</strong> For non-weight exercises like "Red
                band"
              </p>
              <p>
                <strong>Description:</strong> Detailed exercise setup and
                execution (e.g., "Stand with feet shoulder-width apart, toes
                slightly out. Lower until thighs parallel to ground...")
              </p>
            </div>
          </div>
          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
            {`block_id	day	exercise_name	category	type	sets	reps	weight	duration	rest	cues	guidance	resistance	description
Week 1	Day 1	Focus	Intent	mindset	1			2	0	Today's goal: build power, focus on explosive movement
Week 1	Day 1	Squats	Primary	weights	3	10	100		90	Keep chest up, drive through heels	70% 1RM		Stand with feet shoulder-width apart, toes slightly out. Lower until thighs parallel to ground, keeping chest up. Drive through heels to return to standing.
Week 1	Day 1	Band Pull	Additional	weights	3	15			60	Control the movement, squeeze at the top		Red band	`}
          </pre>
          <Popover open={showCopySuccess}>
            <PopoverTrigger asChild className="">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(AI_COPY_TEMPLATE);
                  setShowCopySuccess(true);
                  setTimeout(() => setShowCopySuccess(false), 2000);
                }}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy for AI Generation
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" side="top">
              <div className="flex items-center space-x-2 text-sm">
                <Check className="h-4 w-4 text-green-600" />
                <span>Copied to clipboard!</span>
              </div>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>
    </div>
  );

  const renderProgressTab = () => {};

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <h1 className="text-2xl font-bold dark:text-white">FitFlow</h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            style={{ backgroundColor: darkMode ? "#3b82f6" : "#d1d5db" }}
            aria-label="Toggle dark mode"
          >
            <span
              className={`inline-flex items-center justify-center h-4 w-4 transform rounded-full bg-white transition-transform ${
                darkMode ? "translate-x-6" : "translate-x-1"
              }`}
            >
              {darkMode ? (
                <svg
                  className="w-3 h-3 text-gray-700"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              ) : (
                <svg
                  className="w-3 h-3 text-yellow-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`container mx-auto ${activeTab === "workouts" ? "md:px-4 md:py-4" : "px-4 py-4"}`}>
        {activeTab === "workouts" && renderWorkoutsTab()}
        {activeTab === "config" && renderConfigTab()}
        {activeTab === "progress" && <ProgressTab />}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Validation Dialog */}
      <Dialog
        open={validationDialogOpen}
        onOpenChange={setValidationDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="">
            <DialogTitle className="">Import Preview & Validation</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-800 mb-2">
                  ⚠️ Validation Errors
                </h3>
                <ul className="text-sm text-red-700 space-y-1">
                  {validationErrors.slice(0, 10).map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                  {validationErrors.length > 10 && (
                    <li className="font-semibold">
                      ... and {validationErrors.length - 10} more errors
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Preview Data */}
            <div>
              <h3 className="font-semibold mb-2">Preview (First 5 Rows)</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left p-2">Block ID</th>
                      <th className="text-left p-2">Day</th>
                      <th className="text-left p-2">Exercise</th>
                      <th className="text-left p-2">Category</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Sets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((workout, index) => (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="p-2">{workout.block_id}</td>
                        <td className="p-2">{workout.day}</td>
                        <td className="p-2">{workout.exercise_name}</td>
                        <td className="p-2">{workout.category}</td>
                        <td className="p-2">{workout.type}</td>
                        <td className="p-2">{workout.sets}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">
                Import Summary
              </h3>
              <p className="text-sm text-blue-700">
                Total exercises: {pendingImportData?.workoutData.length || 0}
                <br />
                Unique blocks: {pendingImportData?.blockIds.size || 0}
                <br />
                Validation errors: {validationErrors.length}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <Button
                onClick={cancelImport}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmImport}
                className="flex-1"
                disabled={validationErrors.length > 0}
                variant="default"
                size="sm"
              >
                {validationErrors.length > 0
                  ? "Cannot Import (Errors Found)"
                  : "Confirm Import"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
