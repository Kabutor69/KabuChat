import { ActionSheetIOS, Alert, Platform, LayoutRectangle } from "react-native";
import { useState } from "react";
import { getSocket } from "../lib/socket";
import { type ChatMessage } from "../lib/api";

export const useMessageActions = (
  userId: string | undefined,
  socketConnected: boolean,
  setEditingMessage: (msg: ChatMessage | null) => void,
  setReplyingToMessage: (msg: ChatMessage | null) => void,
  setInput: (text: string) => void,
  inputRef: React.RefObject<any>
) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [menuPosition, setMenuPosition] = useState<LayoutRectangle | null>(null);

  const handleLongPress = (message: ChatMessage, position: LayoutRectangle) => {
    if (message.isDeleted) return;
    setSelectedMessage(message);
    setMenuPosition(position);
    setMenuVisible(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
  };


  const handleActionSelection = (action: string, message: ChatMessage) => {
    switch (action) {
      case "Reply":
        setEditingMessage(null);
        setReplyingToMessage(message);
        inputRef.current?.focus();
        break;
      case "Edit":
        setReplyingToMessage(null);
        setEditingMessage(message);
        setInput(message.content);
        inputRef.current?.focus();
        break;
      case "Delete":
        const socket = getSocket();
        if (socket && socketConnected) {
          socket.emit("deleteMessage", { messageId: message.id });
        }
        break;
    }
  };

  const handleAction = (action: "Reply" | "Edit" | "Delete") => {
    if (!selectedMessage) return;
    handleActionSelection(action, selectedMessage);
    closeMenu();
  };

  return {
    handleLongPress,
    menuVisible,
    selectedMessage,
    menuPosition,
    closeMenu,
    handleAction,
  };
};
