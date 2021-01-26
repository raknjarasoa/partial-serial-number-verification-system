import { Component, OnInit } from "@angular/core";
import { PkvService } from "./pkv.service";

@Component({
  selector: "my-app",
  template: `
    Hello
  `
})
export class AppComponent implements OnInit {
  keyList: string[] = [];

  constructor(private pks: PkvService) {}

  ngOnInit(): void {
    /*const keys = Array.from(Array(3).keys()).map(() => {
      const random = this.generatePseudoRandomNumber(32);
      if (this.pks.createKey(random).length !== 24) {
        console.log(random);
      }
      return this.pks.createKey(random);
    });

    console.log(keys);
    this.keyList = keys;*/

    [
      "0D9C-DAF5-F0CB-63D5-1180",
      "DE81-89F2-2498-A173-7B41",
      "A029-9C44-6C1B-3318-4D2E"
    ].forEach(k => {
      const status = this.pks.checkKey(k);
      console.log(status);
    });
  }

  private generatePseudoRandomNumber(bits: number): number {
    let binary = "";
    for (let j = 0; j < bits; j++) {
      let randByte = parseInt((Math.random() * 2).toString(), 10);
      binary += randByte;
    }
    return parseInt(binary, 2);
  }
}
