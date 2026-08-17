// فحص API docx v9 لمعرفة كيفية حقن sectPr bidi
import { Document, SectionProperties, XmlComponent } from "docx";

// 1) هل SectionProperties constructor يقبل grid أو خيارات إضافية؟
console.log("SectionProperties prototype keys:", Object.getOwnPropertyNames(SectionProperties.prototype));

// 2) هل يمكن subclass SectionProperties وإضافة bidi؟
class BidiSectionProperties extends SectionProperties {
  constructor(options) {
    super(options);
  }
}

// 3) فحص XmlComponent
const xc = new XmlComponent("w:test");
console.log("XmlComponent keys:", Object.getOwnPropertyNames(Object.getPrototypeOf(xc)));

// 4) فحص Document internals
const doc = new Document({ sections: [{ children: [] }] });
const keys = Object.keys(doc);
console.log("Document own keys:", keys);
// البحث عن خاصية sections أو Sections
for (const k of Object.getOwnPropertyNames(Object.getPrototypeOf(doc))) {
  console.log("proto:", k);
}

// 5) محاولة الوصول عبر (doc as any)
const d = doc;
console.log("d.Sections:", d.Sections ? "exists" : "no");
console.log("d.sections:", d.sections ? "exists" : "no");
