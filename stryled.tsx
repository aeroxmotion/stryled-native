import React, {
  ComponentType,
  createContext,
  FC,
  useContext,
  useMemo,
} from 'react'
import { ViewStyle, TextStyle, ImageStyle } from 'react-native'

const VAR_REGEX = /var\(([^)]+)\)/g // TODO: Support default value
const CAMEL_REGEX = /([a-z])-([a-z])/g
const PROP_REGEX = /([a-z-\d]+)[\s\r\n]*:([^;]+);/g
const SELECTOR_REGEX = /\.([\w-.]+)[\s\r\n]*\{([\s\S]+)\}/g
const RESOLVER_TAG = '__Stryled_resolver_'

const rootStyleSymbol = Symbol('Stryled(root.style)')

type RootStyleSymbol = typeof rootStyleSymbol
type Style = ViewStyle & TextStyle & ImageStyle
type Props = Record<string, any>
type Resolver = () => any

interface Context {
  vars: Record<string, Resolver>
  resolvers: Record<string, Resolver>
}

function isResolver(value: any): value is Resolver {
  return typeof value === 'function'
}

function camelizePropName(prop: string) {
  return prop.replace(
    CAMEL_REGEX,
    (_, l1: string, l2: string) => l1 + l2.toUpperCase(),
  )
}

function resolveStyleObject(
  key: RootStyleSymbol | string,
  props: Props,
): Style {
  if (key === rootStyleSymbol) {
    return (props.style = {})
  }

  const styleObject: Style = {}
  const keyPath = key.split('.')
  const lastKey = keyPath[keyPath.length - 1]

  for (const _key of keyPath.slice(0, -1)) {
    props = props[_key] = props[_key] || Object.create(null)
  }

  return (props[lastKey] = styleObject)
}

function getResolver(value: any): Resolver {
  return isResolver(value) ? value : () => value
}

function parseStyle(
  key: RootStyleSymbol | string,
  props: Props,
  style: string,
  context: Context,
) {
  const inRootStyle = key === rootStyleSymbol

  let match: RegExpExecArray | null
  const styleObject: Style = resolveStyleObject(key, props)

  style = style.replace(
    SELECTOR_REGEX,
    (_, selector: string, innerStyle: string) => {
      parseStyle(
        selector,
        inRootStyle ? props : styleObject,
        innerStyle,
        context,
      )

      return ''
    },
  )

  while ((match = PROP_REGEX.exec(style))) {
    const [, prop, value] = match

    parseProp(prop, value.trim(), styleObject, context)
  }

  PROP_REGEX.lastIndex = 0
}

function parseProp(
  prop: string,
  value: string,
  styleObject: Style,
  context: Context,
) {
  value = value.trim()
  let normalizedValue: any = value

  if (value.startsWith(RESOLVER_TAG)) {
    normalizedValue = context.resolvers[normalizedValue]
  } else if (VAR_REGEX.test(value)) {
    normalizedValue = () =>
      value.replace(VAR_REGEX, (_, varName) => {
        return context.vars[varName]?.() ?? ''
      })
  }

  // Is a custom prop?
  if (prop.startsWith('--')) {
    context.vars[prop] = getResolver(normalizedValue)
  } else {
    const normalizedProp = camelizePropName(prop)

    Object.defineProperty(styleObject, normalizedProp, {
      get: getResolver(
        Number.isNaN(parseInt(normalizedValue))
          ? normalizedValue
          : parseInt(normalizedValue),
      ),
      enumerable: true,
      configurable: true,
    })
  }
}

function getStyleToParse(
  resolvers: Record<string, Resolver>,
  parts: TemplateStringsArray,
  values: any[],
) {
  let styleToParse = parts[0]

  for (let i = 0; i < values.length; i++) {
    const value = values[i]

    if (isResolver(value)) {
      const resolverKey = `${RESOLVER_TAG}${i}`

      resolvers[resolverKey] = value
      styleToParse += resolverKey
    }

    styleToParse += parts[i + 1]
  }

  return styleToParse
}

const StyledContext = createContext<Context | null>(null)

export function styled<T>(Component: ComponentType<T>) {
  return <P,>(parts: TemplateStringsArray, ...values: any[]): FC<T & P> => {
    const props: T = {} as any
    const resolvers: Context['resolvers'] = {}
    const styleToParse = getStyleToParse(resolvers, parts, values)

    return _props => {
      const parentContext = useContext(StyledContext)

      const _context = useMemo(() => {
        const context: Context = {
          resolvers,
          vars: parentContext?.vars ?? {},
        }

        parseStyle(rootStyleSymbol, props as any, styleToParse, context)

        return context
      }, [parentContext])

      // TODO: Perform deep merge on props
      return (
        <StyledContext.Provider value={_context}>
          <Component {...{ ...props, ...(_props as any) }} />
        </StyledContext.Provider>
      )
    }
  }
}
