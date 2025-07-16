type FlaskPluginOptions = {
    path: string;
    space: string;
};
type FlaskIndicatorOptions = {
    path: string;
    interval: number;
};
export default function FlaskPersistencePlugin({ path, space, }: FlaskPluginOptions): (openmct: any) => void;
export declare function FlaskIndicatorPlugin({ path, interval, }: FlaskIndicatorOptions): (openmct: any) => void;
export {};
