export interface InteractiveContentButton {
  type: 'button';
  body: {
    text: string;
  };
  action: {
    buttons: {
      type: string;
      reply: {
        id: string | number;
        title: string;
      };
    }[];
  };
}
