import { Field, FieldGetter } from '../Field';
import { Utilities } from '../../Util';

export class GetObject implements FieldGetter {
    keyName: string;

    constructor(keyName: string) {
        this.keyName = keyName;
    }

    getValue(field: Field, onlyChangedData: boolean) {
        let newValue = field.getDomValue();
        let result = {};
        if (onlyChangedData) {
            //In edit case: Only send if changed	
            //Normalize
            let value = null;
            if (field.initialValue) {
                value = field.initialValue[this.keyName];
            }

            if (!Utilities.isEqual(value, newValue)) {
                result[this.keyName] = newValue || "-1";
                return result;
            }
        } else {
            //In creation case: Only send if not null	
            if (newValue) {
                result[this.keyName] = newValue;
                return result;
            }
        }
    }
}