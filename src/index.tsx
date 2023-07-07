/// <reference types="astroturf" />

import {
  AnyObjectSchema,
  InferType,
  SchemaDescription,
  SchemaFieldDescription,
  SchemaInnerTypeDescription,
  SchemaLazyDescription,
  SchemaObjectDescription,
  SchemaRefDescription,
  printValue,
} from 'yup';
import useMediaQuery from '@restart/hooks/useMediaQuery';
import Form, {
  FieldMeta,
  UseFieldProps,
  useErrors,
  useField,
  useFieldArray,
} from 'react-formal';
import { css } from 'astroturf/react';
import { useUncontrolledProp } from 'uncontrollable';
import {
  ComponentPropsWithoutRef,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import vsCodeDark from 'jarle/themes/vsDark';
import vsCodeLight from 'jarle/themes/vsLight';

import { readableColor, getLuminance, transparentize } from 'polished';

export type PrismThemeEntry = {
  color?: string;
  backgroundColor?: string;
  fontStyle?: 'normal' | 'italic';
  fontWeight?:
    | 'normal'
    | 'bold'
    | '100'
    | '200'
    | '300'
    | '400'
    | '500'
    | '600'
    | '700'
    | '800'
    | '900';
  textDecorationLine?:
    | 'none'
    | 'underline'
    | 'line-through'
    | 'underline line-through';
  opacity?: number;
  [styleKey: string]: string | number | void;
};

export type PrismTheme = {
  plain: PrismThemeEntry;
  styles: Array<{
    types: string[];
    style: PrismThemeEntry;
    languages?: string[];
  }>;
};

export type InputSchemaDescription =
  | SchemaDescription
  | SchemaLazyDescription
  | SchemaRefDescription;

export interface DataEditorProps<TSchema extends AnyObjectSchema> {
  schema: TSchema;
  data: InferType<TSchema>;
  defaultData?: InferType<TSchema>;
  theme?: PrismTheme;
  renderInput?: (props: RenderInputOptions) => ReactNode;
  onChange?: (data: InferType<TSchema>) => void;
}

type ThemeDict = Record<string, PrismTheme['styles'][0]['style']>;

type GetPropsForToken = (...tokens: string[]) => {
  className: string;
  style: PrismThemeEntry;
};

const ThemeContext = createContext<{
  theme: PrismTheme;
  colorScheme: 'light' | 'dark';
  renderInput: (props: RenderInputOptions) => ReactNode;
  getPropsForToken: GetPropsForToken;
}>(null as any);

export default function DataEditor<TSchema extends AnyObjectSchema>({
  schema,
  data,
  defaultData,
  renderInput = defaultRenderInput,
  theme: propsTheme,
  onChange,
}: DataEditorProps<TSchema>) {
  const [formValue, handleChange] = useUncontrolledProp(
    data,
    defaultData,
    onChange
  );

  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  const theme = propsTheme ?? (prefersDark ? vsCodeDark : vsCodeLight);

  const themeDict = useMemo(() => {
    let dict: ThemeDict = {};

    for (const { languages, style, types } of theme.styles) {
      for (const token of types) {
        if (languages && !languages.includes('json')) {
          continue;
        }

        dict[token] = style;
      }
    }
    return dict;
  }, [theme]);

  const getPropsForToken = useCallback(
    (...tokens: string[]) => {
      const props = { className: 'token', style: {} };

      for (const token of tokens) {
        const entry = themeDict[token];

        props.className += ` ${token}`;

        if (entry) {
          props.style = { ...props.style, ...entry };
        }
      }

      return props;
    },
    [themeDict]
  );

  const schemaDescription = useMemo(
    () => schema.describe({ value: formValue }),
    [formValue]
  );

  const colorScheme =
    getLuminance(theme.plain.backgroundColor ?? 'white') > 0.179
      ? 'light'
      : 'dark';

  return (
    <ThemeContext.Provider
      value={useMemo(
        () => ({ theme, colorScheme, renderInput, getPropsForToken }),
        [theme, colorScheme, renderInput, getPropsForToken]
      )}
    >
      <pre style={{ fontSize: '95%', colorScheme, ...theme.plain }}>
        <Form
          as={null}
          schema={schema}
          value={formValue}
          onChange={handleChange}
        >
          {renderSchemaDescription(schemaDescription, '')}
        </Form>
      </pre>
    </ThemeContext.Provider>
  );
}

type RenderInputOptions = {
  props: UseFieldProps;
  meta: FieldMeta;
  colorScheme: 'light' | 'dark';
  theme: PrismTheme;
  formattedValue: string;
  schemaDescription: InputSchemaDescription | null;
  token: {
    className: string;
    style: PrismThemeEntry;
  };
};

function defaultRenderInput({
  formattedValue,
  props,
  token,
  theme,
  meta,
}: RenderInputOptions) {
  const width =
    meta.nativeType === 'text' || meta.nativeType === 'number'
      ? `max(50px, ${(!meta.value == null ? '' : formattedValue).length + 5}ch)`
      : 'auto';

  // if (meta.nativeType === 'radio' || meta.nativeType === 'checkbox') {
  //   <input {...props} css={cs} />;
  // }

  return (
    <input
      {...props}
      css={css`
        grid-area: 1 / 1;

        &:not([type='radio'], [type='checkbox']) {
          color: ${token.style.color ?? 'inherit'};
          appearance: none;
          font-size: 100%;

          font-family: inherit;
          line-height: inherit;
          padding: 0;
          border: none;
          height: auto;
          background-color: ${theme.plain.backgroundColor};
          width: ${width};
        }
      `}
    />
  );
}
function renderSchemaDescription(
  description: SchemaFieldDescription | null,
  name: string
) {
  if (description) {
    if (isObjectType(description)) {
      return (
        <ul
          // @ts-ignore
          css={css`
            list-style: none;
            padding-left: ${name ? '2em' : '0'};
          `}
        >
          {Object.entries(description.fields).map(([key, value]) => (
            <ObjectProperty
              key={key}
              propertyDescription={value}
              parentName={name}
              objectKey={key}
            />
          ))}
        </ul>
      );
    }

    if (isListType(description)) {
      return <ArrayValue description={description} name={name} />;
    }
  }

  return <FieldValue description={description} name={name} />;
}

function ObjectProperty({
  propertyDescription,
  parentName,
  objectKey,
}: {
  propertyDescription: SchemaFieldDescription;
  parentName?: string;
  objectKey: string;
}) {
  let fullKey = parentName ? `${parentName}.${objectKey}` : objectKey;
  const error = useErrors(fullKey);

  const isNestedType =
    isObjectType(propertyDescription) || isListType(propertyDescription);

  return (
    <li>
      <div>
        <Token token="property">"{objectKey}"</Token>
        <Token token="operator">:</Token>{' '}
        {isNestedType ? (
          <Token token="punctuation">
            {getOpeningBracket(propertyDescription)}
          </Token>
        ) : (
          renderSchemaDescription(propertyDescription, fullKey)
        )}
        &nbsp;
        <Error for={fullKey} />
      </div>

      {isNestedType && (
        <>
          {renderSchemaDescription(propertyDescription, fullKey)}

          <Token token="punctuation">
            {getClosingBracket(propertyDescription)}
          </Token>
        </>
      )}
    </li>
  );
}

function ArrayValue({
  description,
  name,
}: {
  description: SchemaInnerTypeDescription;
  name: string;
}) {
  const [values, helpers] = useFieldArray(name);

  const innerType = description.innerType;

  function handleAdd() {
    const itemType = Array.isArray(innerType)
      ? innerType[values?.length ?? 0]
      : innerType;

    helpers.push(itemType && 'default' in itemType ? itemType.default : null);
  }

  return (
    <ul
      css={css`
        list-style: none;
      `}
    >
      {values?.map((value, index) => {
        let fullKey = `${name}[${index}]`;

        const itemType = Array.isArray(innerType)
          ? innerType[index]
          : innerType;

        const isNestedType =
          itemType && (isObjectType(itemType) || isListType(itemType));

        return (
          <li key={fullKey} style={{ position: 'relative' }}>
            <Button
              aria-label="Remove array element"
              onClick={() => {
                helpers.remove(value);
              }}
              css={css`
                position: absolute;
                left: -1.5rem;
                top: 0.2rem;
                padding-inline-start: 1px;
              `}
            >
              &times;
            </Button>
            <div>
              <Token token="number">{index}</Token>{' '}
              {isNestedType ? (
                <Token token="punctuation">{getOpeningBracket(itemType)}</Token>
              ) : (
                renderSchemaDescription(itemType ?? null, fullKey)
              )}
              <Error for={fullKey} />
            </div>

            {isNestedType && (
              <>
                {renderSchemaDescription(itemType, fullKey)}

                <Token token="punctuation">{getClosingBracket(itemType)}</Token>
              </>
            )}
          </li>
        );
      })}
      {innerType && (
        <li style={{ position: 'relative' }}>
          &nbsp;
          <Button
            onClick={handleAdd}
            aria-label="Add array element"
            css={css`
              position: absolute;
              left: -2em;
              padding-inline-start: 1px;
            `}
          >
            +
          </Button>
        </li>
      )}
    </ul>
  );
}

function Error({ for: forProp }: { for: string }) {
  const { getPropsForToken } = useContext(ThemeContext);

  return (
    <Form.Message
      {...getPropsForToken('comment')}
      css={css`
        font-size: 85%;
        font-style: italic;
      `}
      for={forProp}
    />
  );
}

function Token({
  token,
  children,
}: {
  token: string;
  children: React.ReactNode;
}) {
  const { getPropsForToken } = useContext(ThemeContext);
  return <span {...getPropsForToken(token)}>{children}</span>;
}

const schemaTypeToToken: Record<string, string[]> = {
  date: ['string'],
  string: ['string'],
  number: ['number'],
};

function FieldValue({
  description,
  name,
}: {
  description: SchemaFieldDescription | null;
  name: string;
}) {
  const { theme, colorScheme, renderInput, getPropsForToken } =
    useContext(ThemeContext);
  const [fieldProps, meta] = useField(name);

  const tokens =
    meta.value == null
      ? meta.value === undefined
        ? ['undefined', 'keyword']
        : ['null', 'keyword']
      : schemaTypeToToken[description?.type!] ?? ['string'];

  const formattedValue = printValue(meta.value, true);
  const inputProps = getPropsForToken(
    ...(schemaTypeToToken[description?.type!] ?? ['string'])
  );

  return (
    <span
      css={css`
        position: relative;
        display: inline-grid;
        grid-template: 1fr / 1fr;
      `}
    >
      <label
        css={css`
          grid-area: 1 / 1;
          opacity: 0;

          &:focus-within {
            opacity: 1;
          }
        `}
      >
        {renderInput({
          formattedValue,
          colorScheme,
          theme,
          meta,
          schemaDescription: description as InputSchemaDescription,
          props: fieldProps,
          token: inputProps,
        })}
      </label>
      <span
        {...getPropsForToken(...tokens)}
        css={css`
          grid-area: 1 / 1;
          pointer-events: none;
          opacity: 1;

          *:focus-within + & {
            opacity: 0;
          }
        `}
      >
        {formattedValue}
      </span>
    </span>
  );
}

function Button(props: ComponentPropsWithoutRef<'button'>) {
  const { theme, colorScheme } = useContext(ThemeContext);
  const contrastColor = readableColor(theme.plain.backgroundColor ?? 'white');

  return (
    <button
      css={css`
        appearance: none;
        background-color: ${transparentize(0.9, contrastColor)};
        border-radius: 9999px;
        font: inherit;
        font-size: 0.7rem;
        border: none;
        padding: 0;
        display: inline-flex;
        font-weight: bold;
        align-items: center;
        justify-content: center;
        width: 1rem;
        height: 1rem;

        &:hover,
        &:focus-visible {
          background-color: ${transparentize(0.85, contrastColor)};
        }
      `}
      {...props}
    />
  );
}

function isObjectType(
  desc: SchemaFieldDescription
): desc is SchemaObjectDescription {
  return 'fields' in desc;
}

function isListType(
  desc: SchemaFieldDescription
): desc is SchemaInnerTypeDescription {
  return desc.type === 'array' || desc.type === 'tuple';
}

const getOpeningBracket = (desc: SchemaFieldDescription) =>
  isListType(desc) ? '[' : isObjectType(desc) ? '{' : '';

const getClosingBracket = (desc: SchemaFieldDescription) =>
  isListType(desc) ? ']' : isObjectType(desc) ? '}' : '';
