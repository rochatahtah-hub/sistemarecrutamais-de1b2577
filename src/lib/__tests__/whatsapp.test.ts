import { expect, test } from "vitest";
import { linkWhatsApp } from "../whatsapp";
test("normaliza", () => {
  expect(linkWhatsApp("(47) 99999-9999")).toBe("https://wa.me/5547999999999");
  expect(linkWhatsApp(" 47 99999 9999 ")).toBe("https://wa.me/5547999999999");
  expect(linkWhatsApp("47999999999")).toBe("https://wa.me/5547999999999");
  expect(linkWhatsApp("5547999999999")).toBe("https://wa.me/5547999999999");
  expect(linkWhatsApp("+55 (47) 99999-9999")).toBe("https://wa.me/5547999999999");
  expect(linkWhatsApp("4733334444")).toBe("https://wa.me/554733334444");
  expect(linkWhatsApp("")).toBeNull();
  expect(linkWhatsApp("123")).toBeNull();
});
