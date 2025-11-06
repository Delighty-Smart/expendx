import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";

interface LineItem {
  id: string;
  description: string;
  amount: number;
  category: string;
  type: "expense" | "income";
}

interface ReceiptReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractedData: {
    amount: number;
    date?: string;
    description: string;
    category?: string;
  };
  categories: Array<{ id: string; name: string }>;
  onConfirmSingle: (data: {
    amount: number;
    date: string;
    description: string;
    category: string;
    type: "expense" | "income";
  }) => void;
  onConfirmMultiple: (items: Array<{
    amount: number;
    date: string;
    description: string;
    category: string;
    type: "expense" | "income";
  }>) => void;
}

export function ReceiptReviewDialog({
  open,
  onOpenChange,
  extractedData,
  categories,
  onConfirmSingle,
  onConfirmMultiple,
}: ReceiptReviewDialogProps) {
  const [mode, setMode] = useState<"single" | "multiple">("single");
  
  // Single transaction state
  const [singleAmount, setSingleAmount] = useState(extractedData.amount.toString());
  const [singleDate, setSingleDate] = useState(extractedData.date || new Date().toISOString().split('T')[0]);
  const [singleDescription, setSingleDescription] = useState(extractedData.description);
  const [singleCategory, setSingleCategory] = useState(extractedData.category || "");
  const [singleType, setSingleType] = useState<"expense" | "income">("expense");

  // Multiple transactions state
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: "1",
      description: extractedData.description,
      amount: extractedData.amount,
      category: extractedData.category || "",
      type: "expense",
    },
  ]);
  const [multiDate, setMultiDate] = useState(extractedData.date || new Date().toISOString().split('T')[0]);

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: Date.now().toString(),
        description: "",
        amount: 0,
        category: "",
        type: "expense",
      },
    ]);
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const handleLineItemChange = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleConfirm = () => {
    if (mode === "single") {
      onConfirmSingle({
        amount: parseFloat(singleAmount),
        date: singleDate,
        description: singleDescription,
        category: singleCategory,
        type: singleType,
      });
    } else {
      onConfirmMultiple(
        lineItems.map((item) => ({
          amount: item.amount,
          date: multiDate,
          description: item.description,
          category: item.category,
          type: item.type,
        }))
      );
    }
    onOpenChange(false);
  };

  const isValid = mode === "single" 
    ? singleAmount && singleDescription && singleCategory
    : lineItems.length > 0 && lineItems.every(item => item.description && item.amount && item.category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Scanned Receipt</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Entry Mode</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as "single" | "multiple")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="single" />
                <Label htmlFor="single" className="font-normal cursor-pointer">
                  Single Transaction (total amount)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="multiple" id="multiple" />
                <Label htmlFor="multiple" className="font-normal cursor-pointer">
                  Multiple Line Items (itemized)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {mode === "single" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={singleAmount}
                  onChange={(e) => setSingleAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={singleDescription}
                  onChange={(e) => setSingleDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={singleCategory} onValueChange={setSingleCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={singleType} onValueChange={(v) => setSingleType(v as "expense" | "income")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="multi-date">Date (applies to all items)</Label>
                <Input
                  id="multi-date"
                  type="date"
                  value={multiDate}
                  onChange={(e) => setMultiDate(e.target.value)}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Line Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddLineItem}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                {lineItems.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Item {index + 1}</span>
                      {lineItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveLineItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            handleLineItemChange(item.id, "description", e.target.value)
                          }
                          placeholder="Item description"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Amount</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) =>
                            handleLineItemChange(item.id, "amount", parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Category</Label>
                        <Select
                          value={item.category}
                          onValueChange={(v) => handleLineItemChange(item.id, "category", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={item.type}
                          onValueChange={(v) => handleLineItemChange(item.id, "type", v as "expense" | "income")}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="expense">Expense</SelectItem>
                            <SelectItem value="income">Income</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="text-sm font-medium text-right">
                  Total: ${lineItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Confirm & Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
