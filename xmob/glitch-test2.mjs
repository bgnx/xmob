import { Cell, ComputedCell, runPendingCells } from "./index2.mjs";
import * as assert from "assert";

const Logs = [];

const firstName = new Cell("fffff");
const lastName = new Cell("lll");

const fullName = new ComputedCell("", () => {
  const newValue = firstName.get() + " " + lastName.get();
  Logs.push(["fullname", newValue]);
  return newValue;
});

const label = new ComputedCell("", () => {
  let newValue;
  if (firstName.get().length <= 3) {
    newValue = fullName.get();
  } else {
    newValue = firstName.get();
  }
  Logs.push(["label", newValue]);
  return newValue;
}, true)


label.get();
firstName.set("ffff");
runPendingCells();
firstName.set("ffff")
runPendingCells();
lastName.set("llll");
runPendingCells();
firstName.set("fff");
runPendingCells();
lastName.set("lllll");
runPendingCells();
firstName.set("ffff");
runPendingCells();
lastName.set("llll");
runPendingCells();

try {
  assert.default.deepStrictEqual(Logs, [
 /*label.get();*/["label", "fffff"], //длина firstName больше 3 и label зависит только от firstName 
 /*firstName.set("ffff");*/["label", "ffff"], // изменилось имя, длина по прежнему больше 3 - пересчитается только label
 /*firstName.set("ffff")*/                    // ничего не добавляется потому что повторно устанавливаем то же значение поэтому ничего пересчитывать не нужно
 /*lastName.set("llll");*/                    // ничего не добавляется потому что от lastName пока никто не зависит
 /*firstName.set("fff");*/["fullname", "fff llll"], ["label", "fff llll"],  //изменилось имя, длина теперь равна 3 и теперь label зависит fullName и вызовет его пересчет а потом и сам пересчитается
 /*lastName.set("lllll");*/["fullname", "fff lllll"], ["label", "fff lllll"], //изменилась фамилия от которой зависит fullname а от него и label и будет два перерасчета
 /*firstName.set("ffff");*/["label", "ffff"], //ключевой момент - изменилось имя но вместо того чтобы вызвать два пересчета - (от firstName зависит fullName и label), нужно вызвать только label потому что в процессе перерасчета label значение fullname не потребуется потому что длина имени теперь больше 3
    /*lastName.set("llll");*/                     //от lastName снова пока никто не зависит и ничего пересчитывать не нужно
  ]);
  console.log("success");
} catch (err) {
  console.log(err);
}