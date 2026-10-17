"use client";

import {
  Camera,
  ClipboardList,
  FileText,
  MapPin,
  MessageSquare,
  Phone,
  Receipt,
  iconProps,
} from "@/components/ui/icons";

export function EvidenceTypeIcon({ type }: { type: string }) {
  const props = { ...iconProps, size: 16 };
  switch (type) {
    case "call":
      return <Phone {...props} />;
    case "message":
      return <MessageSquare {...props} />;
    case "camera":
    case "photo":
      return <Camera {...props} />;
    case "transaction":
      return <Receipt {...props} />;
    case "map":
      return <MapPin {...props} />;
    case "document":
    case "access":
      return <FileText {...props} />;
    case "statement":
      return <ClipboardList {...props} />;
    default:
      return <FileText {...props} />;
  }
}
