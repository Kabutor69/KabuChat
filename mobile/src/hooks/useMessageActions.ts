import { ActionSheetIOS, Alert, Platform } from "react-native";
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
  const handleLongPress = (message: ChatMessage) => {
    if (message.isDeleted) return;

    const isMe = message.sender.clerkId === userId;
    const options: string[] = ["Reply"];
    if (isMe) options.push("Edit", "Delete");
    options.push("Cancel");

    const cancelIndex = options.length - 1;
    const destructiveIndex = options.indexOf("Delete");

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: cancelIndex,
          destructiveButtonIndex: destructiveIndex >= 0 ? destructiveIndex : undefined,
        },
        (buttonIndex) => handleActionSelection(options[buttonIndex], message)
      );
    } else {
      const buttons = options
        .filter((opt) => opt !== "Cancel")
        .map((opt) => ({
          text: opt,
          onPress: () => handleActionSelection(opt, message),
          style: opt === "Delete" ? ("destructive" as const) : ("default" as const),
        }));
      buttons.push({ text: "Cancel", onPress: () => {}, style: "default" as const });
      Alert.alert("Message Actions", undefined, buttons, { cancelable: true });
    }
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
        Alert.alert("Delete Message", "Are you sure you want to delete this message?", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              const socket = getSocket();
              if (socket && socketConnected) {
                socket.emit("deleteMessage", { messageId: message.id });
              }
            },
          },
        ]);
        break;
    }
  };

  return { handleLongPress };
};
