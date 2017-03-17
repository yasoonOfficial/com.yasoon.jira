import { Field, FieldGetter } from '../Field';

export class GetObjectArray implements FieldGetter {
    keyName: string;

    constructor(keyName: string) {
        this.keyName = keyName;
    }

    getValue(field: Field, onlyChangedData: boolean) {
        let newValue = field.getDomValue();
        //In edit case: Only send changes
        if (onlyChangedData) {
            //Both empty
            if (!field.initialValue && newValue.length === 0)
                return;

            //If length the same and all values match, we do not need to send anything            
            if (field.initialValue && field.initialValue.length === newValue.length) {
                let isSame = field.initialValue.every((c) => {
                    return findWithAttr(newValue, this.keyName, c[this.keyName]) > -1;
                });

                if (isSame)
                    return;
            }
            return newValue;
        } else {
            //In creation case: Only send if not null	
            return (newValue.length > 0) ? newValue : undefined;
        }
    }
}